import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { roboflowService, RoboflowInferenceResult } from './roboflowService';
import { validateImageBuffer, ImageValidationResult } from '../utils/imageValidator';

const execFileAsync = promisify(execFile);

export interface InferenceServiceOptions {
  modelId?: string;
  timeoutMs?: number;
  confidence?: number;
  deviceId?: string;
}

export class InferenceService {
  private pythonPath: string;
  private pythonScriptPath: string;
  private microserviceUrl: string;

  constructor() {
    // Locate virtualenv python if available, otherwise fallback to system python3
    const venvPython = path.resolve(__dirname, '../../../.venv/bin/python3');
    this.pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3';
    this.pythonScriptPath = path.resolve(__dirname, '../../inference_service.py');
    this.microserviceUrl = process.env.INFERENCE_SERVICE_URL || 'http://127.0.0.1:5002';
  }

  /**
   * Run model inference on an image Buffer
   * Follows resilient 3-tier execution:
   *   Tier 1: Python HTTP Inference Microservice (if active on port 5002)
   *   Tier 2: Python CLI runner (.venv/bin/python3 inference_service.py)
   *   Tier 3: Cloud Roboflow Serverless fallback (via Node fetch)
   */
  async runInferenceOnBuffer(
    imageBuffer: Buffer,
    options: InferenceServiceOptions = {}
  ): Promise<{ result: RoboflowInferenceResult; validation: ImageValidationResult }> {
    const timeoutMs = options.timeoutMs || 15000;
    const modelId = options.modelId || process.env.ROBOFLOW_MODEL_ID || 'pedestrian-viewer/4';

    // 1. Strict File Type, Magic Bytes, Dimensions, and Size Validation
    const validation = validateImageBuffer(imageBuffer);
    if (!validation.valid) {
      throw new Error(`Image validation failed: ${validation.error}`);
    }

    // 2. Try Tier 1: Local Python Inference HTTP Microservice
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 8000));

      const microserviceRes = await fetch(`${this.microserviceUrl}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': validation.mimeType,
          'x-model-id': modelId,
        },
        body: new Uint8Array(imageBuffer),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (microserviceRes.ok) {
        const data = await microserviceRes.json();
        return { result: data, validation };
      }
    } catch {
      // Microservice is offline or timed out; proceed seamlessly to Tier 2
    }

    // 3. Try Tier 2: Local Python CLI (supports local YOLO and Roboflow in .venv)
    if (fs.existsSync(this.pythonScriptPath)) {
      try {
        const scratchDir = path.resolve(__dirname, '../../../scratch');
        if (!fs.existsSync(scratchDir)) {
          fs.mkdirSync(scratchDir, { recursive: true });
        }
        const tempPath = path.join(scratchDir, `cam_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
        fs.writeFileSync(tempPath, imageBuffer);

        try {
          const { stdout } = await execFileAsync(
            this.pythonPath,
            [this.pythonScriptPath, '--image', tempPath, '--model', modelId, '--json'],
            { timeout: timeoutMs }
          );

          if (stdout && stdout.trim()) {
            const parsed = JSON.parse(stdout.trim());
            if (parsed.success && parsed.predictions) {
              return { result: parsed, validation };
            }
          }
        } finally {
          if (fs.existsSync(tempPath)) {
            try {
              fs.unlinkSync(tempPath);
            } catch {
              // ignore cleanup error
            }
          }
        }
      } catch (cliErr: any) {
        console.warn(`[InferenceService] Python CLI inference attempt failed: ${cliErr.message}. Falling back to Cloud Serverless.`);
      }
    }

    // 4. Try Tier 3: Node-based Roboflow Cloud Serverless fallback
    const base64 = imageBuffer.toString('base64');
    const result = await roboflowService.runInference(base64, {
      modelId,
      confidence: options.confidence,
    });

    return { result, validation };
  }
}

export const inferenceService = new InferenceService();
