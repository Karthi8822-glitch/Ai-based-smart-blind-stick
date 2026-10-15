import { Router } from 'express';
import { sensorController } from '../controllers/sensorController';

const router = Router();

router.get('/latest', sensorController.getLatest);
router.post('/data', sensorController.postData);

export default router;
