import { Router } from 'express';
import { obstacleController } from '../controllers/obstacleController';

const router = Router();

router.get('/', obstacleController.getObstacles);
router.post('/', obstacleController.postObstacle);

export default router;
