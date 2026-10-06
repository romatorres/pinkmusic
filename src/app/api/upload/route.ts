import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const contentType = req.headers.get("content-type") || "";

    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    let fileToUpload = "";
    let folder = "pinkmusic/products";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      fileToUpload = body.file || body.image || body.url || "";
      if (body.folder) folder = body.folder;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const customFolder = formData.get("folder") as string | null;
      if (customFolder) folder = customFolder;

      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, error: "Arquivo muito grande. O limite máximo permitido é 5MB." },
            { status: 400 }
          );
        }

        const mimeType = file.type || "image/jpeg";
        if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
          return NextResponse.json(
            { success: false, error: "Formato de imagem inválido. Formatos permitidos: JPG, PNG ou WEBP." },
            { status: 400 }
          );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fileToUpload = `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    }

    if (!fileToUpload) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo ou imagem foi enviado." },
        { status: 400 }
      );
    }

    const result = await uploadImageToCloudinary(fileToUpload, folder);

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
