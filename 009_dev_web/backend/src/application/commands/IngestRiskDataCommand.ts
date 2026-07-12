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

  async execute(payload: IngestPayload): Promise<boolean> {
    console.log(`[Command] Procesando ingesta para activo: ${payload.assetName}`);
    try {
      await this.prisma.$transaction(async (tx) => {
        // Categoría por defecto
        const category = await tx.category.upsert({
          where: { name: 'Desconocida' },
          update: {},
          create: { name: 'Desconocida' }
        });

        // Peligro (Hazard)
        const hazard = await tx.hazard.upsert({
          where: { name: payload.hazardName },
          update: {},
          create: { name: payload.hazardName }
        });

        // Nuevo Activo 
        const asset = await tx.asset.create({
          data: {
            name: payload.assetName,
            latitude: payload.latitude,
            longitude: payload.longitude,
            base_value: payload.assetValue,
            category_id: category.id
          }
        });

        // RiskScore como exposure_value
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
