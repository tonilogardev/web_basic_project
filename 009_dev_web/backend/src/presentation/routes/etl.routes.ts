import { Router } from 'express';
import { ingestData } from '../controllers/EtlController';
import { apiKeyAuth } from '../middlewares/apiKeyAuth';

const router = Router();

// TAREA 4: Endpoint protegido por API Key
router.post('/ingest', apiKeyAuth, ingestData);

export default router;
