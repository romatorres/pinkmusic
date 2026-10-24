import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/settings/public — retorna configurações públicas visíveis no frontend da loja
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "PIX_DISCOUNT_PERCENT" },
    });

    const pixDiscountPercent = setting ? parseFloat(setting.value) : 5;

    return NextResponse.json({
      success: true,
      data: {
        pixDiscountPercent: isNaN(pixDiscountPercent) ? 5 : pixDiscountPercent,
      },
    });
  } catch (error) {
    console.error("[GET /api/settings/public]", error);
    return NextResponse.json({
      success: true,
      data: { pixDiscountPercent: 5 }, // fallback seguro
    });
  }
}
