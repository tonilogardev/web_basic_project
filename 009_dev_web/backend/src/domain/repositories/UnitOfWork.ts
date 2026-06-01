import { PrismaClient } from '@prisma/client';
import { AssetRepository } from './AssetRepository';

export class UnitOfWork {
  private prisma: PrismaClient;
  public assets: AssetRepository;

  constructor() {
    this.prisma = new PrismaClient();
    this.assets = new AssetRepository(this.prisma);
  }

  // En una base de datos tradicional, aquí iniciaríamos transacción, commit o rollback.
  // Prisma gestiona las transacciones internamente, pero exponer la API mantiene el patrón.
  async commit() {
    // Commit lógico para el patrón UoW
    console.log("UnitOfWork: Transacción completada.");
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}
