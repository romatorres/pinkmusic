import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const categories = await prisma.category.findMany();
    return NextResponse.json(categories);
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const category = await prisma.category.create({
      data: { name },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
