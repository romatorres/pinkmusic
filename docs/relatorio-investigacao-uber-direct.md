# Relatório de Investigação e Diagnóstico: Uber Direct (Pink Music)

**Data:** 25 de Setembro de 2026  
**Ambiente:** Produção / Sandbox Uber Direct API  
**Sistema:** Pink Music Instrumentos (`pinkmusic`)

---

## 1. Objetivo da Investigação

A investigação teve como finalidades:
1. **Remoção temporária da taxa adicional de R$ 2,00** aplicada sobre as cotações para facilitar o acompanhamento e calibração de preços reais.
2. **Rastreamento dos dados da cotação**: validação das coordenadas e endereços de remetente (loja) e destinatário (cliente) enviados à Uber.
3. **Elucidação do modelo de precificação da Uber Direct**: esclarecimento sobre a variação de preços em relação ao aplicativo convencional de passageiros/Flash e motivo da repetição de valores observados nos testes.
4. **Mapeamento de cobertura e raio de entrega** em Feira de Santana - BA.

---

## 2. Configurações e Endereços Validados

### 2.1 Remetente (Ponto de Coleta / Origem)
Os dados do remetente são carregados centralizadamente através da função `getStorePickupAddress()` em `src/lib/uberdirect.ts`:

* **Logradouro:** `Rua JJ Seabra 31 Centro`
* **Cidade / UF:** `Feira de Santana - BA`
* **CEP:** `44002-000`
* **País:** `BR`
* **Coordenadas Geográficas:** Latitude `-12.2664`, Longitude `-38.9663`
* **Telefone de Contato:** `+5575999661614`

> As coordenadas geográficas vinculadas à loja central posicionam o veículo com exatidão métrica para o motoboy/entregador parceiro da Uber, evitando divergências na busca pelo endereço físico.

### 2.2 Destinatário (Ponto de Entrega / Destino)
Os dados do destinatário são capturados no checkout nos modais `PixCheckoutModal.tsx` e `CartCheckoutModal.tsx`:

* **Logradouro:** Formatado com Rua + Número + Bairro + Complemento (ex: `"Rua Barão de Cotegipe, 120, Bairro Centro, Apto 101"`).
* **Cidade / UF:** `Feira de Santana - BA`.
* **CEP:** Preenchido pelo cliente no formulário.
* **Geocodificação:** A Uber Direct realiza a geolocalização e cálculo de rota instantaneamente com base no logradouro + CEP fornecidos.

---

## 3. Alterações Implementadas no Código

### 3.1 Remoção da Taxa Adicional de R$ 2,00
No arquivo `src/app/api/delivery/quote/route.ts`:
* **Antes:** `customerFee = Math.round((rawFeeReais + 2.0) * 100) / 100;`
* **Agora:** `customerFee = rawFeeReais;`  
O valor retornado ao cliente reflete exatamente o custo real cobrado pela Uber, sem margem extra embutida.

### 3.2 Rastreamento Completo de Logs e Payload
Foram adicionados logs estruturados em `src/lib/uberdirect.ts` que exibem no terminal:
* Endereço formatado do remetente
* Endereço formatado do destinatário
* Porte do pacote (`SMALL`, `MEDIUM`, etc.)
* Resposta da Uber com `quoteId`, valor em reais, tempo estimado em minutos e prazo de expiração.
* A API `/api/delivery/quote` agora retorna no objeto `data` os campos `pickup` e `dropoff` para inspeção direta.

---

## 4. Análise de Cobrança: Como Funciona o Uber Direct?

### 4.1 Uber Direct (B2B) vs. Aplicativo Comum (B2C)

| Aspecto | App Convencional (Uber Flash / Passageiro) | Uber Direct (API B2B White Label) |
| :--- | :--- | :--- |
| **Finalidade** | Uso individual sob demanda | Logística de entrega para e-commerce e varejo |
| **Precificação** | Extremamente volátil minuto a minuto (tarifa dinâmica por chuva, trânsito ou falta de carros). | **Tabela Contratual Pré-definida** pela Uber por distância + tempo estimado. |
| **Garantia de Preço** | O preço do app expira em poucos segundos/minutos. | A cotação gera um `quoteId` garantido por **15 minutos** para o cliente concluir o pagamento. |
| **Rastreamento** | Restrito a quem possui o app Uber instalado. | Link web independente (`trackingUrl`), enviado via WhatsApp ao cliente sem necessidade de app. |

### 4.2 O valor é fixo?
**Não, o valor é variável conforme o trajeto e a distância.**

A impressão de que o valor era sempre "R$ 18,10" decorreu de dois fatores:
1. **Acréscimo anterior de R$ 2,00:** Cotações de **R$ 16,10 / R$ 16,20** somadas à margem de R$ 2,00 resultavam em **R$ 18,10**.
2. **Mesma rota ou zona de entrega:** Endereços testados na mesma região central e avenidas principais caem na mesma faixa de cobrança da Uber.

---

## 5. Mapeamento de Testes Reais em Feira de Santana

Testamos múltiplos destinos em bairros reais de Feira de Santana diretamente contra a API oficial da Uber Direct. Os resultados foram:

| Destino / Bairro | Distância Estimada | Tarifa Real Uber | Tempo Estimado | Status da Cotação |
| :--- | :--- | :--- | :--- | :--- |
| **Sobradinho** | ~2,5 km | **R$ 14,30** | 49 min | ✅ Sucesso |
| **Cidade Nova** | ~3,2 km | **R$ 14,30** | 47 min | ✅ Sucesso |
| **Centro (Rua Sales Barbosa)** | ~800 m | **R$ 16,20** | 58 min | ✅ Sucesso |
| **Brasília** | ~2,0 km | **R$ 16,20** | 56 min | ✅ Sucesso |
| **Av. Getúlio Vargas (Centro)**| ~1,5 km | **R$ 18,10** | 56 min | ✅ Sucesso |
| **Kalilândia** | ~1,8 km | **R$ 20,00** | 60 min | ✅ Sucesso |
| **Ponto Central / Sta Mônica**| ~3,5 km | **R$ 21,90** | 65 min | ✅ Sucesso |
| **Capuchinhos** | ~3,8 km | **R$ 21,90** | 65 min | ✅ Sucesso |
| **Bairro SIM (Artêmia Pires)**| ~5,5 km | — | — | ❌ Fora do raio |
| **Tomba (Extremo Sul)** | ~6,1 km | — | — | ❌ Fora do raio |
| **Humildes** | ~17,2 km | — | — | ❌ Fora do raio |

---

## 6. Descoberta Crítica: Limite do Raio de Entrega (5,0 km)

Ao simular entregas em bairros mais afastados (como SIM, Tomba ou Humildes), a API da Uber retornou o seguinte erro:

```json
{
  "code": "address_undeliverable",
  "message": "The specified location is not in a deliverable area.",
  "metadata": {
    "details": "The dropoff location is outside the delivery radius of the pickup location (Max Radius: 3.11 miles, Calculated Distance: 3.78 miles)."
  }
}
```

### O que isso significa:
* **3.11 milhas = exatamente 5,0 km.**
* A conta corporativa da Pink Music na Uber Direct possui atualmente uma **trava de raio de 5 km** a partir do endereço da loja no Centro.
* Pedidos para clientes localizados a mais de 5 km de distância não conseguem cotação pela Uber Direct no momento.

---

## 7. Recomendações e Próximos Passos

1. **Ajuste do Raio no Painel Uber Direct:**
   * Acesse o [Painel Uber Direct](https://direct.uber.com/) com a conta da loja.
   * Nas configurações de entrega da loja ("Store Settings" / "Delivery Radius"), solicite a expansão do raio de atendimento para **10 km ou 15 km**, permitindo cobrir bairros populosos como SIM, Mangabeira, Papagaio, Tomba e CIS.

2. **Tratamento de Mensagem Amigável no Checkout:**
   * Quando o cliente informar um endereço além do raio da Uber, a mensagem de erro deve orientar o cliente de forma clara:  
     *Exemplo: "No momento, as entregas sob demanda atendem até 5 km do Centro. Para entregas em outras regiões, selecione a opção Retirada na Loja ou consulte nossa equipe via WhatsApp."*

3. **Política de Taxa Extra:**
   * Com o teste em andamento sem a taxa de R$ 2,00, é possível acompanhar se os valores de R$ 14,30 a R$ 21,90 cobrem os custos operacionais ou se vale a pena reinserir uma margem fixa (ou percentual) no futuro.
