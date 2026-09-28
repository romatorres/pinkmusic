import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(
  fileBase64OrUrl: string,
  folder = "pinkmusic/products"
): Promise<{ url: string; public_id: string }> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error(
      "Credenciais do Cloudinary não configuradas. Adicione CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET ao .env.local"
    );
  }

  const result = await cloudinary.uploader.upload(fileBase64OrUrl, {
    folder,
    transformation: [
      { quality: "auto", fetch_format: "auto" },
    ],
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
}

export async function deleteImageFromCloudinary(publicIdOrUrl: string): Promise<boolean> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return false;
  }

  try {
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.includes("res.cloudinary.com")) {
      const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (match && match[1]) {
        publicId = match[1];
      }
    }
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Erro ao deletar imagem do Cloudinary:", error);
    return false;
  }
}

export default cloudinary;
