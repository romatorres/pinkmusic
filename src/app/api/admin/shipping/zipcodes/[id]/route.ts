import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

// DELETE /api/admin/shipping/zipcodes/[id] - Exclui CEP
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) return auth.response;

    const { id } = await params;

    await prisma.shippingZipCode.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "CEP excluído com sucesso.",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/shipping/zipcodes/[id]] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir CEP." },
      { status: 500 }
    );
  }
}
