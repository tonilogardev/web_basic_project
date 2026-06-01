import { PrismaClient, Asset } from '@prisma/client';

export class AssetRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  async findAll() {
    return this.prisma.asset.findMany({
      include: {
        Category: true,
        AssetHazardExposure: {
          include: { Hazard: true },
        },
        AssetConditions: {
          include: { Condition: true },
        },
      },
    });
  }

  async findById(id: number) {
    return this.prisma.asset.findUnique({
      where: { id },
      include: {
        Category: true,
        AssetHazardExposure: {
          include: { Hazard: true },
        },
        AssetConditions: {
          include: { Condition: true },
        },
      },
    });
  }

  async create(
    data: { name: string; latitude: number; longitude: number; category_id: number; base_value: number },
    hazard?: { id: number; value: number },
    condition_id?: number
  ) {
    return this.prisma.asset.create({
      data: {
        ...data,
        AssetHazardExposure: hazard ? {
          create: [{ hazard_id: hazard.id, exposure_value: hazard.value }]
        } : undefined,
        AssetConditions: condition_id ? {
          create: [{ condition_id }]
        } : undefined
      },
    });
  }

  async update(id: number, data: Partial<{ name: string; latitude: number; longitude: number; category_id: number; base_value: number }>) {
    return this.prisma.asset.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.asset.delete({
      where: { id },
    });
  }

  async getTotalExposure(): Promise<number> {
    const result = await this.prisma.assetHazardExposure.aggregate({
      _sum: {
        exposure_value: true,
      },
    });
    return Number(result._sum.exposure_value || 0);
  }
}
