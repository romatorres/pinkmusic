import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

// Chaves permitidas de configuração geral
const ALLOWED_KEYS = ["PIX_DISCOUNT_PERCENT"] as const;
type SettingKey = typeof ALLOWED_KEYS[number];

// GET /api/settings — retorna as configurações gerais do sistema
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaff(request);
    if (authResult.response) return authResult.response;

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: [...ALLOWED_KEYS] } },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // Defaults caso ainda não existam no banco
    if (!result["PIX_DISCOUNT_PERCENT"]) {
      result["PIX_DISCOUNT_PERCENT"] = "5";
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar configurações." }, { status: 500 });
  }
}

// PUT /api/settings — salva uma ou mais configurações gerais
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireStaff(request);
    if (authResult.response) return authResult.response;

    const body: Record<string, string> = await request.json();

    const updates: Promise<unknown>[] = [];

    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        const value = body[key];

        // Validação específica por chave
        if (key === "PIX_DISCOUNT_PERCENT") {
          const num = parseFloat(value);
          if (isNaN(num) || num < 0 || num > 100) {
            return NextResponse.json(
              { success: false, error: "Desconto PIX deve ser entre 0 e 100." },
              { status: 400 }
            );
          }
        }

        updates.push(
          prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        );
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma chave válida enviada." }, { status: 400 });
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, message: "Configurações salvas com sucesso." });
  } catch (error) {
    console.error("[PUT /api/settings]", error);
    return NextResponse.json({ success: false, error: "Erro ao salvar configurações." }, { status: 500 });
  }
}

// GET público para o frontend da loja (sem auth) — apenas PIX_DISCOUNT_PERCENT
export async function HEAD() {
  return NextResponse.json({});
}
