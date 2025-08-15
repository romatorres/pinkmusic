import { NextResponse, NextRequest } from "next/server";
import * as jose from "jose";
import prisma from "@/lib/prisma";

interface DecodedToken {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verificar se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json({ message: "Erro de configuração do servidor." }, { status: 500 });
    }

    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      
      // Converter o payload para o tipo DecodedToken
      const decodedToken: DecodedToken = {
        userId: payload.userId as string,
        role: payload.role as string,
        iat: payload.iat as number,
        exp: payload.exp as number
      };

      const user = await prisma.user.findUnique({
        where: { id: decodedToken.userId },
        select: { id: true, email: true, role: true, name: true },
      });

      if (!user) {
        return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
      }

      return NextResponse.json(user);
    } catch (error) {
      console.error("Token verification error:", error);
      return NextResponse.json({ message: "Token inválido." }, { status: 401 });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
}
