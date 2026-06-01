import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateJWT, requireRole } from '../../infrastructure/middleware/authMiddleware';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);

// Ruta de ejemplo para probar la autenticación y roles
router.get('/me', authenticateJWT, (req, res) => {
  res.json({ message: 'Estás autenticado', user: (req as any).user });
});

router.get('/admin-only', authenticateJWT, requireRole('READ_WRITE'), (req, res) => {
  res.json({ message: 'Tienes acceso de escritura (READ_WRITE)' });
});

export default router;
