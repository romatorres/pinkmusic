import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult.response) {
      return authResult.response;
    }

    const contentType = req.headers.get("content-type") || "";

    let fileToUpload = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      fileToUpload = body.file || body.image || body.url || "";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || "image/jpeg";
        fileToUpload = `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    }

    if (!fileToUpload) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo ou imagem foi enviado." },
        { status: 400 }
      );
    }

    const result = await uploadImageToCloudinary(fileToUpload);

    return NextResponse.json({
      success: true,
      url: result.url,
      publicId: result.public_id,
      message: "Imagem enviada para o Cloudinary com sucesso!",
    });
  } catch (error) {
    console.error("Erro no upload Cloudinary:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao realizar upload.",
      },
      { status: 500 }
    );
  }
}
