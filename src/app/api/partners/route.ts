import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany();
    return NextResponse.json(partners);
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const name = data.get("name") as string;
    const image = data.get("image") as File;

    if (!name || !image) {
      return new NextResponse("Missing name or image", { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const imageName = `${Date.now()}_${image.name}`;
    const imagePath = path.join(process.cwd(), "public/partners", imageName);
    await writeFile(imagePath, buffer);

    const partner = await prisma.partner.create({
      data: {
        name,
        imageUrl: imageName,
      },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("Error creating partner:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
