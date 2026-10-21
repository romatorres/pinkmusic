import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(req.url);
    const activeParam = searchParams.get("active");
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};

    if (activeParam === "true") {
      where.active = true;
    } else if (activeParam === "false") {
      where.active = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { plate: { contains: search, mode: "insensitive" } },
        { pixKey: { contains: search, mode: "insensitive" } },
      ];
    }

    const couriers = await prisma.courier.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { rides: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: couriers,
    });
  } catch (error) {
    console.error("Erro ao listar motoboys:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao listar motoboys",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await req.json();
    const { name, phone, pixKey, pixKeyType, vehicle, plate, notes, active } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome do profissional é obrigatório." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Telefone/WhatsApp do profissional é obrigatório." },
        { status: 400 }
      );
    }

    // Normalizar telefone (apenas números para WhatsApp)
    const cleanPhone = phone.replace(/\D/g, "");

    const courier = await prisma.courier.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        pixKey: pixKey?.trim() || null,
        pixKeyType: pixKeyType || null,
        vehicle: vehicle?.trim() || null,
        plate: plate?.trim()?.toUpperCase() || null,
        notes: notes?.trim() || null,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: courier,
        message: "Motoboy cadastrado com sucesso!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao cadastrar motoboy:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao cadastrar motoboy",
      },
      { status: 500 }
    );
  }
}
