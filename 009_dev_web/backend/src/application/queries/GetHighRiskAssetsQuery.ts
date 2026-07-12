import { PrismaClient } from '@prisma/client';

export class GetHighRiskAssetsQuery {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // CQRS QUERY: Solo lee datos de forma optimizada, no modifica estado
  async execute() {
    console.log("[Query] Obteniendo activos con alto riesgo de exposición");

    // Una consulta compleja para analistas, ejecutada directamente sobre la base de datos
    const highRiskAssets = await this.prisma.asset.findMany({
      where: {
        AssetHazardExposure: {
          some: {
            // Filtrar activos que tengan alguna exposición mayor a 10 millones
            exposure_value: { gt: 10000000 }
          }
        }
      },
      include: {
        AssetHazardExposure: {
          include: {
            Hazard: true
          }
        }
      },
      orderBy: {
        base_value: 'desc'
      },
      // Optimización de lectura: solo cogemos los primeros 50
      take: 50
    });

    // Proyectar a un DTO limpio para la vista
    return highRiskAssets.map(asset => ({
      assetId: asset.id,
      name: asset.name,
      value: Number(asset.base_value),
      criticalExposures: asset.AssetHazardExposure
        .filter(exp => Number(exp.exposure_value) > 10000000)
        .map(exp => ({
          hazard: exp.Hazard.name,
          riskCost: Number(exp.exposure_value)
        }))
    }));
  }
}
