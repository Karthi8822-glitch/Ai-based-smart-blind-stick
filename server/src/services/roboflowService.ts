import fs from 'fs';
import path from 'path';

export interface RoboflowRawPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id?: number;
  detection_id?: string;
  points?: Array<{ x: number; y: number }>;
  mask_format?: string;
}

export interface EnrichedPrediction extends RoboflowRawPrediction {
  id: string;
  safetyStatus: 'SAFE' | 'CAUTION' | 'CRITICAL';
  estimatedDistance: number; // in meters
  guidanceText: string;
  boxPercent: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  pointsPercent?: Array<{ x: number; y: number }>;
}

export interface RoboflowInferenceResult {
  inferenceId: string;
  model: string;
  processingTimeMs: number;
  imageDimensions: {
    width: number;
    height: number;
  };
  predictionsCount: number;
  predictions: EnrichedPrediction[];
  summary: {
    hasObstacles: boolean;
    hasNavigablePath: boolean;
    primarySafetyStatus: 'SAFE' | 'CAUTION' | 'CRITICAL';
    speechAnnouncement: string;
  };
  raw: any;
}

export class RoboflowService {
  private get apiKey(): string {
    const key = process.env.ROBOFLOW_API_KEY;
    if (!key) {
      throw new Error('ROBOFLOW_API_KEY is not defined in server environment (.env)');
    }
    return key;
  }

  private get modelId(): string {
    return process.env.ROBOFLOW_MODEL_ID || 'pedestrian-viewer/4';
  }

  /**
   * Run Roboflow Serverless Cloud API inference on a base64 encoded image
   */
  async runInference(
    base64Image: string,
    options: { confidence?: number; modelId?: string } = {}
  ): Promise<RoboflowInferenceResult> {
    // Strip data URL header if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z0-9+]+;base64,/i, '');

    const activeModelId = options.modelId || this.modelId;
    const endpoint = `https://serverless.roboflow.com/${activeModelId}${
      options.confidence ? `?confidence=${options.confidence}` : ''
    }`;

    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: cleanBase64,
    });

    const elapsedMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Roboflow API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const imgWidth = data.image?.width || 1280;
    const imgHeight = data.image?.height || 720;
    const rawPredictions: RoboflowRawPrediction[] = data.predictions || [];

    let hasObstacles = false;
    let hasNavigablePath = false;
    let primarySafetyStatus: 'SAFE' | 'CAUTION' | 'CRITICAL' = 'SAFE';

    const enrichedPredictions: EnrichedPrediction[] = rawPredictions.map((pred, idx) => {
      // Calculate bounding box top-left and percentages
      const leftPx = Math.max(0, pred.x - pred.width / 2);
      const topPx = Math.max(0, pred.y - pred.height / 2);

      const boxPercent = {
        left: Number(((leftPx / imgWidth) * 100).toFixed(2)),
        top: Number(((topPx / imgHeight) * 100).toFixed(2)),
        width: Number(((pred.width / imgWidth) * 100).toFixed(2)),
        height: Number(((pred.height / imgHeight) * 100).toFixed(2)),
      };

      // Convert polygon mask points to 0-100% coordinates for responsive rendering
      const pointsPercent = pred.points
        ? pred.points.map((pt) => ({
            x: Number(((pt.x / imgWidth) * 100).toFixed(2)),
            y: Number(((pt.y / imgHeight) * 100).toFixed(2)),
          }))
        : undefined;

      // Distance estimation based on object height relative to visual frame
      const relativeH = pred.height / imgHeight;
      let estimatedDistance = Number((3.5 - relativeH * 3.0).toFixed(1));
      if (estimatedDistance < 0.4) estimatedDistance = 0.4;
      if (estimatedDistance > 4.5) estimatedDistance = 4.5;

      // Determine safety status & blind-stick guidance
      const lowerClass = (pred.class || '').toLowerCase();
      let safetyStatus: 'SAFE' | 'CAUTION' | 'CRITICAL' = 'SAFE';
      let guidanceText = 'Clear corridor ahead';

      if (lowerClass.includes('sidewalk') || lowerClass.includes('walkway') || lowerClass.includes('path')) {
        safetyStatus = 'SAFE';
        hasNavigablePath = true;
        guidanceText = `Navigable sidewalk detected. Safe walking corridor confirmed.`;
      } else if (lowerClass.includes('fall') || lowerClass.includes('fallen')) {
        safetyStatus = 'CRITICAL';
        hasObstacles = true;
        primarySafetyStatus = 'CRITICAL';
        guidanceText = `Emergency alert: Person fall detected! Triggering caregiver alert.`;
      } else if (
        lowerClass.includes('car') ||
        lowerClass.includes('truck') ||
        lowerClass.includes('vehicle') ||
        lowerClass.includes('bus') ||
        lowerClass.includes('motorcycle') ||
        lowerClass.includes('bike')
      ) {
        safetyStatus = 'CRITICAL';
        hasObstacles = true;
        primarySafetyStatus = 'CRITICAL';
        guidanceText = `Traffic hazard: ${pred.class} detected ahead at ~${estimatedDistance}m. Stand clear of roadway!`;
      } else if (lowerClass.includes('obstacle') || lowerClass.includes('barrier') || lowerClass.includes('stair')) {
        safetyStatus = estimatedDistance < 1.2 ? 'CRITICAL' : 'CAUTION';
        hasObstacles = true;
        if (safetyStatus === 'CRITICAL') primarySafetyStatus = 'CRITICAL';
        guidanceText = `Obstacle detected ahead at ~${estimatedDistance}m. Caution advised.`;
      } else if (lowerClass.includes('pedestrian') || lowerClass.includes('person')) {
        safetyStatus = estimatedDistance < 1.5 ? 'CRITICAL' : 'CAUTION';
        hasObstacles = true;
        if (primarySafetyStatus !== 'CRITICAL') primarySafetyStatus = 'CAUTION';
        guidanceText = `Approaching pedestrian detected at ~${estimatedDistance}m.`;
      } else if (lowerClass.includes('verge') || lowerClass.includes('curb')) {
        safetyStatus = 'CAUTION';
        guidanceText = `Roadside verge / margin boundary detected.`;
      }

      return {
        ...pred,
        id: pred.detection_id || `pred-${idx}-${Date.now()}`,
        safetyStatus,
        estimatedDistance,
        guidanceText,
        boxPercent,
        pointsPercent,
      };
    });

    // Formulate a natural synthesized speech announcement
    let speechAnnouncement = 'Visual scanner active. Path clear ahead.';
    if (enrichedPredictions.length > 0) {
      const sidewalks = enrichedPredictions.filter((p) => p.class.toLowerCase().includes('sidewalk'));
      const falls = enrichedPredictions.filter((p) => p.class.toLowerCase().includes('fall'));
      const vehicles = enrichedPredictions.filter((p) =>
        ['car', 'truck', 'vehicle', 'bus', 'motorcycle'].some((v) => p.class.toLowerCase().includes(v))
      );
      const hazards = enrichedPredictions.filter((p) => p.safetyStatus === 'CRITICAL' || p.safetyStatus === 'CAUTION');

      if (falls.length > 0) {
        speechAnnouncement = 'Emergency alert: Fall incident detected. Alerting caregivers.';
      } else if (vehicles.length > 0) {
        const closestVeh = vehicles.reduce((prev, curr) => (prev.estimatedDistance < curr.estimatedDistance ? prev : curr));
        speechAnnouncement = `Warning: ${closestVeh.class} detected at ${closestVeh.estimatedDistance} meters. Stay alert!`;
      } else if (hazards.length > 0) {
        const closest = hazards.reduce((prev, curr) => (prev.estimatedDistance < curr.estimatedDistance ? prev : curr));
        speechAnnouncement = `Caution: ${closest.class} detected at ${closest.estimatedDistance} meters.`;
      } else if (sidewalks.length > 0) {
        speechAnnouncement = 'Navigable sidewalk confirmed ahead. Safe to proceed.';
      }
    }

    return {
      inferenceId: data.inference_id || `inf-${Date.now()}`,
      model: activeModelId,
      processingTimeMs: elapsedMs,
      imageDimensions: {
        width: imgWidth,
        height: imgHeight,
      },
      predictionsCount: enrichedPredictions.length,
      predictions: enrichedPredictions,
      summary: {
        hasObstacles,
        hasNavigablePath,
        primarySafetyStatus,
        speechAnnouncement,
      },
      raw: data,
    };
  }

  /**
   * Run inference on one of the project's local image files
   */
  async runInferenceOnSample(
    sampleName: string,
    options: { confidence?: number; modelId?: string } = {}
  ): Promise<RoboflowInferenceResult> {
    const candidates = [
      path.resolve(process.cwd(), sampleName),
      path.resolve(process.cwd(), '..', sampleName),
      path.resolve(__dirname, '../../../', sampleName),
      path.resolve(__dirname, '../../../client/public/assets', sampleName),
      path.resolve(__dirname, '../../../frames', sampleName),
    ];

    let foundPath: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      throw new Error(`Sample image not found on server: ${sampleName}`);
    }

    const base64 = fs.readFileSync(foundPath, { encoding: 'base64' });
    return this.runInference(base64, options);
  }

  /**
   * Run inference on a remote image URL
   */
  async runInferenceOnUrl(
    imageUrl: string,
    options: { confidence?: number; modelId?: string } = {}
  ): Promise<RoboflowInferenceResult> {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch image from URL: ${imageUrl} (status ${res.status})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return this.runInference(base64, options);
  }
}

export const roboflowService = new RoboflowService();
