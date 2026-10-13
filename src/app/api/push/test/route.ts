import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { sendTestNotificationToUser } from "@/lib/firebase/notifications";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) {
      return auth.response;
    }

    const userId = auth.user!.userId;
    const result = await sendTestNotificationToUser(userId);

    if (!result.success && result.tokensCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Você ainda não possui nenhum dispositivo ativo cadastrado. Ative as notificações primeiro neste aparelho.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      sentCount: result.sentCount,
      tokensCount: result.tokensCount,
      error: result.error,
    });
  } catch (error: unknown) {
    console.error("[POST /api/push/test] Erro:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro ao disparar notificação de teste.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
