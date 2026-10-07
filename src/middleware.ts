import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

export async function middleware(request: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET is not defined");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    const role = typeof payload.role === "string" ? payload.role : null;
    const pathname = request.nextUrl.pathname;

    // 1. Cliente "USER" não pode de hipótese alguma ter acesso ao Dashboard.
    // Redireciona imediatamente para sua área de pedidos.
    if (role === "USER") {
      return NextResponse.redirect(new URL("/meus-pedidos", request.url));
    }

    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 2. Rotas acessíveis por Funcionário e Admin (Catálogo da Loja)
    const staffPrefixes = [
      "/dashboard/products",
      "/dashboard/categories",
      "/dashboard/brands",
    ];

    const isStaffOnlyRoute = staffPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    const isStaff = role === "ADMIN" || role === "EMPLOYEE";

    if (isStaffOnlyRoute && !isStaff) {
      return NextResponse.redirect(new URL("/dashboard/orders", request.url));
    }

    // 3. Rotas exclusivas de Administrador
    const adminOnlyPrefixes = [
      "/dashboard/users",
      "/dashboard/register",
      "/dashboard/partners",
      "/dashboard/shipping",
    ];

    const isAdminOnlyRoute = adminOnlyPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isAdminOnlyRoute && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/orders", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Invalid token:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
