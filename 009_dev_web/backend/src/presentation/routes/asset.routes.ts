import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';
import { authenticateJWT, requireRole } from '../../infrastructure/middleware/authMiddleware';

const router = Router();
const assetController = new AssetController();

// Aplicamos el middleware de autenticación a todas las rutas de activos
router.use(authenticateJWT);

// Endpoint agregado (debe ir antes que /:id para no confundir rutas)
router.get('/total-exposure', assetController.getTotalExposure);

// CRUD básico (Permisos Restaurados a Alta Seguridad)
router.get('/', assetController.getAll);
router.post('/', requireRole('READ_WRITE'), assetController.create);
router.get('/:id', assetController.getById);
router.put('/:id', requireRole('READ_WRITE'), assetController.update);
router.delete('/:id', requireRole('READ_WRITE'), assetController.delete);

export default router;
