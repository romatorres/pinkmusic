import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, email, password } = await request.json();
    const updateData: { name?: string; email?: string; password?: string } = {};

    if (name) {
      updateData.name = name;
    }
    if (email) {
      updateData.email = email;
    }
    if (password) {
      // Se uma nova senha for fornecida, criptografá-la
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData, // Usar updateData
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error editing user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.user.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
