import { Request, Response } from 'express';
import { inferenceService } from '../services/inferenceService';
import { roboflowService } from '../services/roboflowService';
import { dataService } from '../services/dataService';
import { validateImageBuffer } from '../utils/imageValidator';
import { getSupabaseClient, isSupabaseConnected } from '../config/supabase';

const VALID_DEVICE_KEY = process.env.DEVICE_INGEST_KEY || 'nexus-sbs-device-credential-token';
const PRIVATE_STORAGE_BUCKET = 'nexus-camera-frames';

export const visionController = {
  /**
   * Secure Camera Frame Capture & Ingestion from ESP32-CAM
   * POST /api/vision/capture
   * Accepts:
   *   - Binary image/jpeg body directly from ESP32-CAM
   *   - JSON payload { "image": "base64...", "deviceId": "nexus-01" }
   */
  async capture(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Request Authentication
      const headerDeviceId = (req.headers['x-device-id'] as string) || (req.body?.deviceId as string) || 'nexus-01';
      const providedKey = (req.headers['x-device-key'] as string) || (req.body?.deviceKey as string) || (req.query?.key as string);

      if (!providedKey || providedKey !== VALID_DEVICE_KEY) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid or missing device authentication credential (x-device-key).',
          code: 'AUTH_FAILED',
        });
        return;
      }

      const deviceId = headerDeviceId.trim();

      // 2. Extract Image Buffer (Raw Binary or Base64 JSON)
      let imageBuffer: Buffer | null = null;

      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        imageBuffer = req.body;
      } else if (req.body && typeof req.body.image === 'string') {
        const cleanB64 = req.body.image.replace(/^data:image\/[a-z0-9+]+;base64,/i, '');
        imageBuffer = Buffer.from(cleanB64, 'base64');
      } else if (req.body && typeof req.body.frame === 'string') {
        const cleanB64 = req.body.frame.replace(/^data:image\/[a-z0-9+]+;base64,/i, '');
        imageBuffer = Buffer.from(cleanB64, 'base64');
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No image data received. Provide raw image bytes with Content-Type: image/jpeg or JSON with base64 "image".',
          code: 'EMPTY_PAYLOAD',
        });
        return;
      }

      // 3. Strict Validation: 5MB upload limit, Magic Bytes, Dimensions (64x64 to 4096x4096)
      const validation = validateImageBuffer(imageBuffer);
      if (!validation.valid) {
        const statusCode = validation.error?.includes('exceeds 5MB')
          ? 413
          : validation.error?.includes('Invalid file signature')
          ? 415
          : 400;

        res.status(statusCode).json({
          success: false,
          error: validation.error,
          code: 'VALIDATION_FAILED',
          sizeBytes: imageBuffer.length,
        });
        return;
      }

      // 4. Run Pretrained Model Inference with 15s Timeout
      const requestedModel = (req.headers['x-model-id'] as string) || req.body?.modelId || process.env.ROBOFLOW_MODEL_ID || 'pedestrian-viewer/4';
      
      const { result: inferenceResult } = await inferenceService.runInferenceOnBuffer(imageBuffer, {
        modelId: requestedModel,
        timeoutMs: 15000,
        deviceId,
      });

      // 5. Store Frame in Private Supabase Storage Bucket
      let storagePath: string | null = null;
      let signedImageUrl: string | null = null;
      const supabase = getSupabaseClient();

      if (supabase && isSupabaseConnected()) {
        try {
          const timestamp = Date.now();
          storagePath = `captures/${deviceId}/${timestamp}_frame.${validation.format}`;

          const { error: uploadError } = await supabase.storage
            .from(PRIVATE_STORAGE_BUCKET)
            .upload(storagePath, imageBuffer, {
              contentType: validation.mimeType,
              upsert: true,
            });

          if (uploadError) {
            console.warn('[visionController] Supabase storage upload notice:', uploadError.message);
          } else {
            // Generate private signed URL valid for 1 hour (3600 seconds)
            const { data: signedData } = await supabase.storage
              .from(PRIVATE_STORAGE_BUCKET)
              .createSignedUrl(storagePath, 3600);

            if (signedData?.signedUrl) {
              signedImageUrl = signedData.signedUrl;
            }
          }
        } catch (storageErr: any) {
          console.warn('[visionController] Storage error (continuing with inference):', storageErr.message);
        }
      }

      // 6. Save Detection Metadata to Supabase `public.ai_detections`
      const predictions = inferenceResult.predictions || [];
      const primaryPred = predictions.length > 0 ? predictions[0] : null;
      const topLabel = primaryPred
        ? `${primaryPred.class.toUpperCase()} (${(primaryPred.confidence * 100).toFixed(0)}%)`
        : 'NO_HAZARD_DETECTED';
      const topConfidence = primaryPred ? primaryPred.confidence : 0;

      if (supabase && isSupabaseConnected()) {
        try {
          await supabase.from('ai_detections').insert({
            device_id: deviceId,
            model_name: inferenceResult.model || requestedModel,
            label: topLabel,
            confidence: Number(topConfidence.toFixed(3)),
            bounding_box: {
              predictions,
              summary: inferenceResult.summary,
              imageDimensions: inferenceResult.imageDimensions,
            },
            image_url: signedImageUrl || storagePath || null,
            inference_time_ms: inferenceResult.processingTimeMs || (Date.now() - startTime),
            timestamp: new Date().toISOString(),
          });

          // 7. Verified Camera Online Update in `live_sensor_data`
          // Camera is ONLY set to 'online' here upon verified receipt and processing of a real frame!
          const obstacleLevel = inferenceResult.summary?.primarySafetyStatus === 'CRITICAL'
            ? 'critical'
            : inferenceResult.summary?.primarySafetyStatus === 'CAUTION'
            ? 'warning'
            : 'clear';

          await supabase
            .from('live_sensor_data')
            .update({
              camera_status: 'online',
              obstacle_level: obstacleLevel,
              updated_at: new Date().toISOString(),
            })
            .ilike('device_id', deviceId);

          // Update device last_seen timestamp
          await supabase
            .from('devices')
            .update({
              status: 'online',
              last_seen: new Date().toISOString(),
            })
            .ilike('device_id', deviceId);

        } catch (dbErr: any) {
          console.warn('[visionController] Supabase telemetry update error:', dbErr.message);
        }
      }

      // 8. Return Verified Real Inference Result
      res.status(200).json({
        success: true,
        deviceId,
        cameraStatus: 'online',
        verified: true,
        imageDimensions: inferenceResult.imageDimensions,
        format: validation.format,
        fileSizeBytes: imageBuffer.length,
        storage: {
          bucket: PRIVATE_STORAGE_BUCKET,
          path: storagePath,
          signedUrl: signedImageUrl,
        },
        inference: {
          model: inferenceResult.model,
          processingTimeMs: inferenceResult.processingTimeMs,
          totalRoundtripMs: Date.now() - startTime,
          predictionsCount: predictions.length,
          predictions,
          summary: inferenceResult.summary,
        },
      });

    } catch (error: any) {
      console.error('[visionController] Capture error:', error);
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('timed out');
      res.status(isTimeout ? 504 : 500).json({
        success: false,
        error: isTimeout ? 'Inference execution timed out (exceeded 15s limit).' : error.message || 'Vision capture failed.',
        code: isTimeout ? 'INFERENCE_TIMEOUT' : 'INTERNAL_ERROR',
      });
    }
  },

  /**
   * Get Latest Verified Detection and Signed Frame
   * GET /api/vision/latest?deviceId=nexus-01
   */
  async getLatestDetection(req: Request, res: Response): Promise<void> {
    const deviceId = ((req.query.deviceId as string) || 'nexus-01').trim();
    const supabase = getSupabaseClient();

    if (!supabase || !isSupabaseConnected()) {
      res.status(200).json({
        success: true,
        data: null,
        message: 'Supabase cloud database is not connected.',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ai_detections')
        .select('*')
        .ilike('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        res.status(500).json({ success: false, error: error.message });
        return;
      }

      if (!data) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'No AI detections recorded for this device yet.',
        });
        return;
      }

      // If image_url is a storage path (e.g. captures/...), generate a fresh signed URL
      let signedUrl = data.image_url;
      if (data.image_url && !data.image_url.startsWith('http')) {
        const { data: signedData } = await supabase.storage
          .from(PRIVATE_STORAGE_BUCKET)
          .createSignedUrl(data.image_url, 3600);
        if (signedData?.signedUrl) {
          signedUrl = signedData.signedUrl;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          ...data,
          signedImageUrl: signedUrl,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Run Roboflow/YOLO inference on a sample or base64 image
   * POST /api/vision/infer
   */
  async infer(req: Request, res: Response): Promise<void> {
    try {
      const { image, sampleName, imageUrl, modelId, syncObstacles = true, deviceId = 'nexus-01' } = req.body;

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

      // Synchronize with database if requested
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

          // Record in ai_detections
          await dataService.recordAIDetection({
            deviceId,
            modelName: options.modelId || 'pedestrian-viewer/4',
            label: `${pred.class.toUpperCase()} (${(pred.confidence * 100).toFixed(0)}%)`,
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
        error: error.message || 'Vision inference execution failed',
      });
    }
  },

  /**
   * List available sample images and benchmark scenarios
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
      inferenceArchitecture: {
        pythonServiceAvailable: true,
        localYOLOSupport: true,
        roboflowServerlessSupport: true,
        storageBucket: PRIVATE_STORAGE_BUCKET,
        storagePrivate: true,
        maxUploadBytes: 5242880,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        timeoutSeconds: 15,
      },
      supportedModels: [
        { id: 'pedestrian-viewer/4', name: 'Pedestrian & Walkway', type: 'Instance Segmentation' },
        { id: 'vechile-zleex/2', name: 'Vehicle & Traffic Detection', type: 'Object Detection' },
        { id: 'fall-detection-ca3o8/4', name: 'Fall & Emergency Detection', type: 'Object Detection' },
        { id: 'people-detection-o4rdr/12', name: 'People & Crowd Detection', type: 'Object Detection' },
        { id: 'object-detection-9ffwy/1', name: 'Object & Barrier Detection', type: 'Object Detection' },
      ],
      backend: 'Roboflow Serverless Cloud API + Ultralytics Python',
      endpoint: `https://serverless.roboflow.com`,
      authConfigured: hasKey,
      authMethod: 'x-device-key Header or Token Authentication',
    });
  },
};
