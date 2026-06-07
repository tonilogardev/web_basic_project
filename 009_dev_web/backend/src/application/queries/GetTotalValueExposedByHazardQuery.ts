import { PrismaClient } from '@prisma/client';

export class GetTotalValueExposedByHazardQuery {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // CQRS QUERY: Solo lee datos de forma optimizada, no modifica estado
  async execute() {
    console.log("[Query] Calculando valor total expuesto agrupado por peligro");

    // Realiza una agrupación directamente en la base de datos (Query SQL nativa de agrupación)
    const exposures = await this.prisma.assetHazardExposure.groupBy({
      by: ['hazard_id'],
      _sum: {
        exposure_value: true,
      },
      orderBy: {
        _sum: {
          exposure_value: 'desc'
        }
      }
    });

    const hazards = await this.prisma.hazard.findMany();

    // Proyectar DTO limpio
    return exposures.map(exp => {
      const hazardName = hazards.find(h => h.id === exp.hazard_id)?.name || 'Unknown';
      return {
        hazard: hazardName,
        totalExposedValue: exp._sum.exposure_value ? Number(exp._sum.exposure_value) : 0
      };
    });
  }
}
