import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logout bem-sucedido." });
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0, // Expira imediatamente
  });
  return response;
}
