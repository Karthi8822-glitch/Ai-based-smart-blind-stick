import { Router } from 'express';
import { deviceController } from '../controllers/deviceController';

const router = Router();

router.get('/status', deviceController.getStatus);
router.post('/register', deviceController.registerDevice);

export default router;
