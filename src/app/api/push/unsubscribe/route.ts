import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { z } from "zod";

const unsubscribeSchema = z.object({
  token: z.string().min(5, "Token inválido"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) {
      return auth.response;
    }

    const userId = auth.user!.userId;
    const body = await request.json();
    const parsed = unsubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Desativa a subscription apenas se pertencer ao usuário autenticado
    await prisma.pushSubscription.updateMany({
      where: {
        token,
        userId,
      },
      data: {
        enabled: false,
      },
    });

    return NextResponse.json({ success: true, message: "Notificações desativadas para este dispositivo." });
  } catch (error) {
    console.error("[POST /api/push/unsubscribe] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao desativar dispositivo." },
      { status: 500 }
    );
  }
}
