import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

export async function middleware(request: NextRequest) {
  // Verificar se JWT_SECRET está definido
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jose.jwtVerify(token, secret);
    return NextResponse.next();
  } catch (error) {
    console.error("Invalid token:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: "/dashboard/:path*",
};
