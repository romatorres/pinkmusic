import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/admin/shipping/unresolved - Lista CEPs não resolvidos ordenados por hitCount
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (search) {
      const cleanDigits = search.replace(/\D/g, "");
      where.OR = [
        ...(cleanDigits ? [{ zipCode: { contains: cleanDigits } }] : []),
        { district: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.shippingUnresolvedZip.findMany({
      where,
      orderBy: [{ hitCount: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/shipping/unresolved] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar CEPs não resolvidos." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/shipping/unresolved - Remove um registro não resolvido (após mapeamento)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const zipCode = searchParams.get("zipCode");

    if (!id && !zipCode) {
      return NextResponse.json(
        { success: false, error: "Informe id ou zipCode para remover." },
        { status: 400 }
      );
    }

    if (id) {
      await prisma.shippingUnresolvedZip.delete({ where: { id } });
    } else if (zipCode) {
      await prisma.shippingUnresolvedZip.delete({ where: { zipCode } });
    }

    return NextResponse.json({
      success: true,
      message: "Registro removido com sucesso.",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/shipping/unresolved] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir registro não resolvido." },
      { status: 500 }
    );
  }
}
