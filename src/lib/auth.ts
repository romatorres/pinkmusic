import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

export interface AuthUser {
  userId: string;
  role: string;
}

function parseCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${key}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(key.length + 1));
}

export async function getValidatedUserFromRequest(
  request: Request | NextRequest
): Promise<AuthUser | null> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return null;
  }

  let token: string | null = null;

  if (request instanceof NextRequest) {
    token = request.cookies.get("auth_token")?.value ?? null;
  } else {
    token = parseCookieValue(request.headers.get("cookie"), "auth_token");
  }

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const userId = typeof payload.userId === "string" ? payload.userId : null;
    const role = typeof payload.role === "string" ? payload.role : null;

    if (!userId || !role) {
      return null;
    }

    return { userId, role };
  } catch {
    return null;
  }
}

export const ROLE_ADMIN = "ADMIN";
export const ROLE_EMPLOYEE = "EMPLOYEE";
export const ROLE_USER = "USER";

export function isAdminRole(role?: string | null): boolean {
  return role === ROLE_ADMIN;
}

export function isStaffRole(role?: string | null): boolean {
  return role === ROLE_ADMIN || role === ROLE_EMPLOYEE || role === "FUNCIONARIO";
}

export function isCustomerRole(role?: string | null): boolean {
  return role === ROLE_USER;
}

export async function requireAuth(
  request: Request | NextRequest
): Promise<{ user: AuthUser | null; response: NextResponse | null }> {
  const user = await getValidatedUserFromRequest(request);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Não autorizado." },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}

export async function requireStaff(
  request: Request | NextRequest
): Promise<{ user: AuthUser | null; response: NextResponse | null }> {
  const auth = await requireAuth(request);

  if (auth.response) {
    return auth;
  }

  if (!isStaffRole(auth.user?.role)) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Acesso negado. Apenas equipe autorizada." },
        { status: 403 }
      ),
    };
  }

  return auth;
}

export async function requireAdmin(
  request: Request | NextRequest
): Promise<{ user: AuthUser | null; response: NextResponse | null }> {
  const auth = await requireAuth(request);

  if (auth.response) {
    return auth;
  }

  if (!isAdminRole(auth.user?.role)) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Acesso negado. Apenas administradores." },
        { status: 403 }
      ),
    };
  }

  return auth;
}

