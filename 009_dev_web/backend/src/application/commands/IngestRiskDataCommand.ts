import { PrismaClient } from '@prisma/client';

export interface IngestPayload {
  assetName: string;
  latitude: number;
  longitude: number;
  assetValue: number;
  hazardName: string;
  riskScore: number;
}

export class IngestRiskDataCommand {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // CQRS COMMAND: Cambia el estado del sistema, no devuelve datos (solo un boolean o void)
  async execute(payload: IngestPayload): Promise<boolean> {
    console.log(`[Command] Procesando ingesta para activo: ${payload.assetName}`);

    // Como es un entorno ETL, podríamos usar una transacción para asegurar consistencia
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Buscar o crear la categoría por defecto (para evitar fallos de Foreign Key)
        const category = await tx.category.upsert({
          where: { name: 'Desconocida' },
          update: {},
          create: { name: 'Desconocida' }
        });

        // 2. Buscar o crear el peligro (Hazard)
        const hazard = await tx.hazard.upsert({
          where: { name: payload.hazardName },
          update: {},
          create: { name: payload.hazardName }
        });

        // 3. Crear el nuevo Activo importado
        const asset = await tx.asset.create({
          data: {
            name: payload.assetName,
            latitude: payload.latitude,
            longitude: payload.longitude,
            base_value: payload.assetValue,
            category_id: category.id
          }
        });

        // 4. Crear la exposición al riesgo (RiskScore como exposure_value)
        await tx.assetHazardExposure.create({
          data: {
            asset_id: asset.id,
            hazard_id: hazard.id,
            exposure_value: payload.riskScore
          }
        });
      });

      return true;
    } catch (error) {
      console.error("[Command Error] Falla al insertar en base de datos:", error);
      throw error;
    }
  }
}
