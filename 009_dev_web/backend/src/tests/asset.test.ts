import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AssetRepository } from '../domain/repositories/AssetRepository';
import { PrismaClient } from '@prisma/client';

// Mock de Prisma para aislar las pruebas unitarias (No toca la base de datos real)
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    assetHazardExposure: {
      aggregate: jest.fn(),
    },
    asset: {
      findUnique: jest.fn(),
    }
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

describe('AssetRepository - Unit Tests', () => {
  let repository: AssetRepository;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = new PrismaClient();
    repository = new AssetRepository(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getTotalExposure() debería devolver el valor agregado matemático correcto', async () => {
    // Arrange (Preparar datos dummy)
    prismaMock.assetHazardExposure.aggregate.mockResolvedValue({
      _sum: { exposure_value: 50000000 },
    });

    // Act (Ejecutar método del repositorio)
    const total = await repository.getTotalExposure();

    // Assert (Verificar que se obtiene lo esperado)
    expect(total).toBe(50000000);
    expect(prismaMock.assetHazardExposure.aggregate).toHaveBeenCalledWith({
      _sum: { exposure_value: true },
    });
  });

  test('findById() debería buscar y devolver un único activo por su ID', async () => {
    // Arrange
    const dummyAsset = { id: 1, name: 'Estadio de Pruebas', base_value: 1000 };
    prismaMock.asset.findUnique.mockResolvedValue(dummyAsset);

    // Act
    const result = await repository.findById(1);

    // Assert
    expect(result).toEqual(dummyAsset);
    expect(prismaMock.asset.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
  });
});
