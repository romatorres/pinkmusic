import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { isValidEmail, normalizeEmail } from "@/lib/authValidation";

// GET /api/auth/users
// - ?type=system -> lista apenas ADMIN e FUNCIONARIO (somente Admin)
// - ?type=customers -> lista apenas USER com métricas de pedidos (Staff: Admin e Funcionário)
// - sem param -> padrão lista equipe (ADMIN e FUNCIONARIO)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "customers") {
      // Clientes podem ser visualizados por Admin e Funcionário
      const authResult = await requireStaff(request);
      if (authResult.response) {
        return authResult.response;
      }

      const customers = await prisma.user.findMany({
        where: {
          role: "USER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Mapeia adicionando estatísticas convenientes
      const formattedCustomers = customers.map((c) => {
        const totalOrders = c.orders.length;
        const totalSpent = c.orders
          .filter((o) => o.status !== "CANCELLED" && o.status !== "PENDING_PAYMENT")
          .reduce((sum, o) => sum + o.totalAmount, 0);

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          role: c.role,
          createdAt: c.createdAt,
          totalOrders,
          totalSpent,
          orders: c.orders,
        };
      });

      return NextResponse.json(formattedCustomers);
    }

    // Padrão: Usuários do sistema (ADMIN e FUNCIONARIO) - restrito a ADMIN
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const systemUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "EMPLOYEE", "FUNCIONARIO"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(systemUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Erro ao buscar usuários." },
      { status: 500 }
    );
  }
}

// POST /api/auth/users -> Cria um novo usuário da equipe (ADMIN ou EMPLOYEE)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const roleInput = typeof body.role === "string" ? body.role.toUpperCase() : "EMPLOYEE";
    const role = roleInput === "FUNCIONARIO" ? "EMPLOYEE" : roleInput;

    if (!name || name.length < 3) {
      return NextResponse.json(
        { message: "O nome deve ter pelo menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { message: "Email inválido." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (role !== "ADMIN" && role !== "EMPLOYEE") {
      return NextResponse.json(
        { message: "Função inválida. Escolha 'ADMIN' ou 'EMPLOYEE'." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Já existe um usuário cadastrado com este email." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Usuário do sistema criado com sucesso.",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating system user:", error);
    return NextResponse.json(
      { message: "Erro ao criar usuário do sistema." },
      { status: 500 }
    );
  }
}
