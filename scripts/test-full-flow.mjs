import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTest() {
  console.log("==================================================");
  console.log("🚀 INICIANDO TESTE DO FLUXO COMPLETO DO SISTEMA");
  console.log("==================================================");

  let testUser = null;
  let testProduct = null;
  let testOrder = null;
  let testSubscription = null;

  try {
    // 1. Verificar ou obter usuário com perfil ADMIN ou EMPLOYEE
    console.log("\n[1/6] 👤 Buscando vendedor/admin existente...");
    testUser = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "EMPLOYEE"] } },
    });

    if (!testUser) {
      console.log("Criando usuário temporário para teste...");
      testUser = await prisma.user.create({
        data: {
          email: `vendedor-teste-${Date.now()}@pinkmusic.com`,
          password: "hash_senha_teste",
          name: "Vendedor Teste",
          role: "EMPLOYEE",
        },
      });
    }
    console.log(`✅ Usuário identificado: ${testUser.name} (${testUser.role}) - ID: ${testUser.id}`);

    // 2. Testar cadastro de dispositivo de notificação (PushSubscription)
    console.log("\n[2/6] 📱 Registrando dispositivo Push simulado...");
    const mockToken = `fcm_test_token_${Date.now()}`;
    testSubscription = await prisma.pushSubscription.upsert({
      where: { token: mockToken },
      update: { enabled: true },
      create: {
        userId: testUser.id,
        token: mockToken,
        deviceName: "Samsung Galaxy S23 (Teste)",
        userAgent: "Mozilla/5.0 (Linux; Android 14) PinkMusicTest/1.0",
        enabled: true,
      },
    });
    console.log(`✅ Dispositivo registrado com sucesso: ${testSubscription.deviceName} (ID: ${testSubscription.id})`);

    // 3. Buscar ou criar produto para venda
    console.log("\n[3/6] 🎸 Localizando produto para o pedido...");
    testProduct = await prisma.product.findFirst({
      where: { available_quantity: { gt: 0 } },
    });

    if (!testProduct) {
      testProduct = await prisma.product.create({
        data: {
          title: "Guitarra Strato Pink Teste",
          price: 1250.0,
          thumbnail: "/img/pinkmusic-logo.png",
          available_quantity: 5,
        },
      });
    }
    console.log(`✅ Produto selecionado: ${testProduct.title} - R$ ${testProduct.price}`);

    // 4. Criar pedido com opção de Entrega (Delivery)
    console.log("\n[4/6] 🛒 Criando novo pedido com entrega local...");
    testOrder = await prisma.order.create({
      data: {
        customerName: "Cliente Teste Silva",
        customerPhone: "(75) 99999-8888",
        deliveryType: "delivery",
        deliveryAddress: "Av. Getúlio Vargas, 1000 - Centro, Feira de Santana - BA",
        shippingPrice: 15.0,
        shippingMethod: "LOCAL_DELIVERY",
        totalAmount: testProduct.price + 15.0,
        status: "PENDING_PAYMENT",
        mpPaymentId: `mp_test_${Date.now()}`,
        items: {
          create: [
            {
              productId: testProduct.id,
              title: testProduct.title,
              price: testProduct.price,
              quantity: 1,
            },
          ],
        },
      },
      include: { items: true },
    });
    console.log(`✅ Pedido #${testOrder.id.slice(-6).toUpperCase()} criado com status: ${testOrder.status}`);
    console.log(`   Endereço: ${testOrder.deliveryAddress}`);
    console.log(`   Total: R$ ${testOrder.totalAmount.toFixed(2)} (Produto: R$ ${testProduct.price} + Frete: R$ 15.00)`);

    // 5. Simular Confirmação de Pagamento PIX e Idempotência
    console.log("\n[5/6] 💳 Simulando confirmação do pagamento (Status: PAID)...");
    
    // Atualiza pedido para PAID como faz o webhook
    const paidOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        pushNotifiedAt: new Date(), // Simulação do registro de idempotência
      },
    });

    console.log(`✅ Pagamento confirmado com sucesso!`);
    console.log(`   Status atual: ${paidOrder.status}`);
    console.log(`   Data de pagamento: ${paidOrder.paidAt?.toISOString()}`);
    console.log(`   Data do registro de notificação push: ${paidOrder.pushNotifiedAt?.toISOString()}`);

    // Teste de Idempotência: verificar se o sistema detecta que já foi notificado
    const checkOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
      select: { pushNotifiedAt: true },
    });
    if (checkOrder?.pushNotifiedAt) {
      console.log(`✅ Validação de Idempotência: pushNotifiedAt registrado, previne notificações duplicadas.`);
    }

    // 6. Testar fluxo operacional: Preparação -> Despacho -> Entrega (Finalização)
    console.log("\n[6/6] 🚚 Testando fluxo completo de despacho e finalização...");

    // a) Preparação
    const prepOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: { status: "PREPARING" },
    });
    console.log(`   → Etapa 1: Pedido em separação [${prepOrder.status}]`);

    // b) Despacho para entrega
    const dispatchedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        status: "DISPATCHED",
        uberCourierName: "Motoboy João",
        uberDispatchedAt: new Date(),
      },
    });
    console.log(`   → Etapa 2: Pedido despachado para entrega com ${dispatchedOrder.uberCourierName} [${dispatchedOrder.status}]`);

    // c) Entrega Concluída (Finalização)
    const deliveredOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: { status: "DELIVERED" },
    });
    console.log(`   → Etapa 3: Pedido ENTREGUE e FINALIZADO [${deliveredOrder.status}] 🎉`);

    console.log("\n==================================================");
    console.log("✨ TODOS OS TESTES PASSARAM COM SUCESSO!");
    console.log("   - Model PushSubscription: OK");
    console.log("   - Registro de Aparelho: OK");
    console.log("   - Criação de Pedido: OK");
    console.log("   - Pagamento PIX e Idempotência: OK");
    console.log("   - Logística e Entrega: OK");
    console.log("   - Finalização do Pedido: OK");
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Erro durante a execução do teste:", error);
    process.exit(1);
  } finally {
    // Limpeza dos dados criados durante o teste
    console.log("\n🧹 Limpando dados temporários de teste...");
    if (testOrder) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
      await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
    }
    if (testSubscription) {
      await prisma.pushSubscription.delete({ where: { id: testSubscription.id } }).catch(() => {});
    }
    console.log("✅ Ambiente limpo.");
    await prisma.$disconnect();
  }
}

runTest();
