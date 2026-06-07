import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { IngestRiskDataCommand } from '../../application/commands/IngestRiskDataCommand';

const prisma = new PrismaClient();
const ingestCommand = new IngestRiskDataCommand(prisma);

export const ingestData = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    await ingestCommand.execute(payload);
    res.status(201).json({ message: 'Datos ingestados correctamente.' });
  } catch (error: any) {
    console.error("Error en EtlController:", error);
    res.status(500).json({ error: 'Error procesando la ingesta de datos.' });
  }
};
