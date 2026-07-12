import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GetHighRiskAssetsQuery } from '../../application/queries/GetHighRiskAssetsQuery';
import { GetTotalValueExposedByHazardQuery } from '../../application/queries/GetTotalValueExposedByHazardQuery';

const prisma = new PrismaClient();
const getHighRiskQuery = new GetHighRiskAssetsQuery(prisma);
const getTotalValueByHazardQuery = new GetTotalValueExposedByHazardQuery(prisma);

export const getHighRiskAssets = async (req: Request, res: Response) => {
  try {
    const data = await getHighRiskQuery.execute();
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Error en AnalysisController:", error);
    res.status(500).json({ error: 'Error obteniendo los datos de análisis.' });
  }
};

export const getTotalExposedValue = async (req: Request, res: Response) => {
  try {
    const data = await getTotalValueByHazardQuery.execute();
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Error en AnalysisController:", error);
    res.status(500).json({ error: 'Error obteniendo los datos de análisis agregados.' });
  }
};
