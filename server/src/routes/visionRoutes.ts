import { Router } from 'express';
import { visionController } from '../controllers/visionController';

const router = Router();

// Run Roboflow instance segmentation inference
router.post('/infer', visionController.infer);

// Get list of test scenarios & samples
router.get('/samples', visionController.getSamples);

// Get model configuration status
router.get('/status', visionController.getStatus);

export default router;
