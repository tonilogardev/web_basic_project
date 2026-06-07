import { Router } from 'express';
import { getHighRiskAssets } from '../controllers/AnalysisController';

const router = Router();

// TAREA 3: Endpoint de lectura CQRS
// Lo dejamos abierto o podemos protegerlo con JWT. Para probarlo fácil en Postman lo dejamos abierto.
router.get('/high-risk', getHighRiskAssets);

export default router;
