import { Router } from 'express';
import { locationController } from '../controllers/locationController';

const router = Router();

router.get('/latest', locationController.getLatestLocation);
router.post('/', locationController.updateLocation);

export default router;
