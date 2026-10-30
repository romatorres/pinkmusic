import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

// Em ambientes Serverless (como Vercel), garante que lambdas reutilizadas (warm containers)
// reaproveitem a mesma instância e conexão do PrismaClient em vez de abrir novas conexões.
globalThis.prisma = prisma
