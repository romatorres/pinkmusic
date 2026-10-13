import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) {
      return auth.response;
    }

    const userId = auth.user!.userId;

    const devices = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: devices });
  } catch (error) {
    console.error("[GET /api/push/devices] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar dispositivos." },
      { status: 500 }
    );
  }
}
