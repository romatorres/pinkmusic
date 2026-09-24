import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStaff(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        orders: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                code: true,
              },
            },
            items: {
              select: {
                id: true,
                title: true,
                price: true,
                quantity: true,
                thumbnail: true,
                productCode: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { message: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return NextResponse.json(
      { message: "Erro ao buscar detalhes do cliente." },
      { status: 500 }
    );
  }
}
