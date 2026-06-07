import { Request, Response, NextFunction } from 'express';

const API_KEY_HEADER = 'x-api-key';
const EXPECTED_API_KEY = process.env.ETL_API_KEY || 'default-secret-key';

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header(API_KEY_HEADER);

  if (!apiKey) {
    return res.status(401).json({ error: 'Falta la API Key en las cabeceras (x-api-key).' });
  }

  if (apiKey !== EXPECTED_API_KEY) {
    return res.status(403).json({ error: 'API Key inválida. Acceso denegado.' });
  }

  // Si la clave es correcta, pasa al siguiente middleware/controlador
  next();
};
