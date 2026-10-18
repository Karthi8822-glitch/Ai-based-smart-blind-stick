import { Router } from 'express';
import { visionController } from '../controllers/visionController';

const router = Router();

// Secure Camera Frame Ingestion from ESP32-CAM (Binary JPEG or JSON base64)
router.post('/capture', visionController.capture);

// Latest verified AI Detection and signed camera frame
router.get('/latest', visionController.getLatestDetection);

// Run Roboflow or local YOLO inference on test/sample images
router.post('/infer', visionController.infer);

// Get list of test scenarios & samples
router.get('/samples', visionController.getSamples);

// Get model configuration and inference service status
router.get('/status', visionController.getStatus);

export default router;
