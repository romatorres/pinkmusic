import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);

    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, role } = body;
    const updateData: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    } = {};

    const isAdmin = authResult.user?.role === "ADMIN";
    const isOwner = authResult.user?.userId === id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { message: "Acesso negado." },
        { status: 403 }
      );
    }

    if (name && typeof name === "string") {
      updateData.name = name.trim();
    }
    if (email && typeof email === "string") {
      updateData.email = email.trim().toLowerCase();
    }
    if (password && typeof password === "string" && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Apenas Administrador pode alterar a role de um usuário
    if (isAdmin && role && typeof role === "string") {
      const upperRole = role.toUpperCase();
      if (upperRole === "ADMIN" || upperRole === "EMPLOYEE") {
        updateData.role = upperRole;
      } else if (upperRole === "FUNCIONARIO") {
        updateData.role = "EMPLOYEE";
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error editing user:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor ao atualizar usuário." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);

    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const isAdmin = authResult.user?.role === "ADMIN";

    // Somente administradores podem excluir usuários
    if (!isAdmin) {
      return NextResponse.json(
        { message: "Acesso negado. Apenas administradores podem excluir usuários." },
        { status: 403 }
      );
    }

    // Não permite auto-exclusão
    if (authResult.user?.userId === id) {
      return NextResponse.json(
        { message: "Você não pode excluir sua própria conta de administrador." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "Erro ao excluir usuário." },
      { status: 500 }
    );
  }
}