import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { z } from "zod";

const subscribeSchema = z.object({
  token: z.string().min(10, "Token FCM inválido"),
  deviceName: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) {
      return auth.response;
    }

    const userId = auth.user!.userId;
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { token, deviceName, userAgent } = parsed.data;

    // Upsert idempotente do token associado ao usuário autenticado
    const subscription = await prisma.pushSubscription.upsert({
      where: { token },
      update: {
        userId,
        deviceName: deviceName || null,
        userAgent: userAgent || null,
        enabled: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        token,
        deviceName: deviceName || null,
        userAgent: userAgent || null,
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        enabled: subscription.enabled,
      },
    });
  } catch (error) {
    console.error("[POST /api/push/subscribe] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao registrar dispositivo." },
      { status: 500 }
    );
  }
}
