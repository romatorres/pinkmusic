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
    const { name, email, password } = await request.json();
    const updateData: { name?: string; email?: string; password?: string } = {};

    const isAdmin = authResult.user?.role === "ADMIN";
    const isOwner = authResult.user?.userId === id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { message: "Acesso negado." },
        { status: 403 }
      );
    }

    if (name) {
      updateData.name = name;
    }
    if (email) {
      updateData.email = email;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error editing user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
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
    const isOwner = authResult.user?.userId === id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { message: "Acesso negado." },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}