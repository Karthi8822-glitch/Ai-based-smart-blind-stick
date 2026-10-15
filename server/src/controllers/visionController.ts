import { Request, Response } from 'express';
import { roboflowService } from '../services/roboflowService';
import { dataService } from '../services/dataService';

export const visionController = {
  /**
   * Run Roboflow Serverless Inference
   * POST /api/vision/infer
   */
  async infer(req: Request, res: Response): Promise<void> {
    try {
      const { image, sampleName, imageUrl, modelId, syncObstacles = true, deviceId = 'SBS-001' } = req.body;

      if (!image && !sampleName && !imageUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: provide "image" (base64 string), "sampleName", or "imageUrl".',
        });
        return;
      }

      const options = { modelId };
      let result;
      if (sampleName) {
        result = await roboflowService.runInferenceOnSample(sampleName, options);
      } else if (imageUrl) {
        result = await roboflowService.runInferenceOnUrl(imageUrl, options);
      } else {
        result = await roboflowService.runInference(image, options);
      }

      // If requested, synchronize detected hazards with Smart Blind Stick telemetry
      if (syncObstacles && result.predictions && result.predictions.length > 0) {
        for (const pred of result.predictions) {
          if (pred.safetyStatus === 'CRITICAL' || pred.safetyStatus === 'CAUTION') {
            await dataService.addObstacle({
              deviceId,
              label: `${pred.class.toUpperCase()} (Roboflow AI)`,
              distance: pred.estimatedDistance,
              confidence: Number(pred.confidence.toFixed(2)),
              dangerLevel: pred.safetyStatus === 'CRITICAL' ? 'high' : 'medium',
              boundingBox: {
                x: pred.boxPercent.left,
                y: pred.boxPercent.top,
                width: pred.boxPercent.width,
                height: pred.boxPercent.height,
              },
              detectedAt: new Date(),
            });

            await dataService.addAlert({
              deviceId,
              type: pred.safetyStatus === 'CRITICAL' ? 'buzzer' : 'vibration',
              severity: pred.safetyStatus === 'CRITICAL' ? 'critical' : 'warning',
              message: `Roboflow Vision: ${pred.class.toUpperCase()} at ${pred.estimatedDistance}m (${(pred.confidence * 100).toFixed(0)}% conf)`,
            });
          }

          // Record AI detection telemetry in database
          await dataService.recordAIDetection({
            deviceId,
            modelName: options.modelId || 'pedestrian-viewer/4',
            label: pred.class,
            confidence: pred.confidence,
            boundingBox: pred.boxPercent,
            inferenceTimeMs: result.processingTimeMs || 35,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Vision inference error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message || 'Roboflow inference execution failed',
      });
    }
  },

  /**
   * List available sample images and scenarios
   * GET /api/vision/samples
   */
  async getSamples(_req: Request, res: Response): Promise<void> {
    const samples = [
      {
        id: 'sample-3',
        filename: '3.jpg',
        title: 'Sidewalk Traversal & Path Margin',
        description: 'Primary urban walkway scene featuring concrete pavement, curb boundary, and open walking corridor.',
        category: 'Sidewalk / Path Navigation',
        imageUrl: '/assets/3.jpg',
        expectedClasses: ['sidewalk', 'verge'],
      },
      {
        id: 'sample-1',
        filename: 'road-crossing.jpg',
        title: 'Pedestrian Crossing & Street Traversal',
        description: 'Ground-level path scanning along sidewalk edge and asphalt transition zone.',
        category: 'Corridor Inspection',
        imageUrl: '/assets/road-crossing.jpg',
        expectedClasses: ['sidewalk', 'curb'],
      },
      {
        id: 'sample-2',
        filename: 'walking-on-stairs.jpg',
        title: 'Walking on Stairs',
        description: 'Staircase descent and elevation changes with step edge and handrail scanning.',
        category: 'Elevation Transition',
        imageUrl: '/assets/walking-on-stairs.jpg',
        expectedClasses: ['obstacle', 'staircase'],
      },
      {
        id: 'frame-001',
        filename: 'detecting-pothole.jpg',
        title: 'Detecting pothole',
        description: 'Surface pothole and fractured asphalt scanning for ground elevation and terrain safety.',
        category: 'Surface Hazard',
        imageUrl: '/assets/detecting-pothole.jpg',
        expectedClasses: ['obstacle', 'pothole'],
      },
    ];

    res.status(200).json({
      success: true,
      data: samples,
    });
  },

  /**
   * Health and Model Configuration Status
   * GET /api/vision/status
   */
  async getStatus(_req: Request, res: Response): Promise<void> {
    const hasKey = Boolean(process.env.ROBOFLOW_API_KEY);
    const model = process.env.ROBOFLOW_MODEL_ID || 'pedestrian-viewer/4';

    res.status(200).json({
      success: true,
      activeModel: model,
      supportedModels: [
        { id: 'pedestrian-viewer/4', name: 'Pedestrian & Walkway', type: 'Instance Segmentation' },
        { id: 'vechile-zleex/2', name: 'Vehicle & Traffic Detection', type: 'Object Detection' },
        { id: 'fall-detection-ca3o8/4', name: 'Fall & Emergency Detection', type: 'Object Detection' },
        { id: 'people-detection-o4rdr/12', name: 'People & Crowd Detection', type: 'Object Detection' },
        { id: 'object-detection-9ffwy/1', name: 'Object & Barrier Detection', type: 'Object Detection' },
      ],
      backend: 'Roboflow Serverless Cloud API (v1.5.0+)',
      endpoint: `https://serverless.roboflow.com`,
      authConfigured: hasKey,
      authMethod: 'Authorization: Bearer <API_KEY> Header',
    });
  },
};
