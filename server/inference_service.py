#!/usr/bin/env python3
"""
Nexus AI Smart Blind Stick - Vision Inference Service
Supports:
  1. Local YOLO models (.pt / .onnx via Ultralytics)
  2. Roboflow Serverless Cloud Models (pedestrian-viewer/4 instance segmentation, vechile-zleex/2, fall-detection-ca3o8/4)
  3. Image file/dimension/mime validation
  4. Dual-mode: CLI runner or HTTP microservice (port 5002)
"""

import os
import sys
import time
import json
import base64
import argparse
from io import BytesIO
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, List, Optional, Tuple

from dotenv import load_dotenv
from PIL import Image

# Load environment variables
env_candidates = [
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parent.parent / ".env",
]
for p in env_candidates:
    if p.exists():
        load_dotenv(dotenv_path=p)

DEFAULT_ROBOFLOW_KEY = os.getenv("ROBOFLOW_API_KEY", "zMRTKGJi7FR4h3ibIC08")
DEFAULT_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "pedestrian-viewer/4")
MODELS_DIR = Path(__file__).resolve().parent / "models"


def validate_image_bytes(image_data: bytes) -> Tuple[Image.Image, Dict[str, Any]]:
    """
    Validate image file type, magic bytes, dimensions, and size.
    Enforces:
      - Size <= 5MB
      - Dimensions between 64x64 and 4096x4096
      - Formats: JPEG, PNG, WEBP
    """
    if len(image_data) > 5 * 1024 * 1024:
        raise ValueError("Image payload exceeds 5MB size limit (Max: 5,242,880 bytes).")

    if len(image_data) < 16:
        raise ValueError("Image payload is too small or truncated.")

    # Validate Magic Bytes
    is_jpeg = image_data[:3] == b"\xff\xd8\xff"
    is_png = image_data[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = len(image_data) > 12 and image_data[:4] == b"RIFF" and image_data[8:12] == b"WEBP"

    if not (is_jpeg or is_png or is_webp):
        raise ValueError("Unsupported image format. Allowed formats are JPEG, PNG, and WebP.")

    try:
        img = Image.open(BytesIO(image_data))
        img.verify()
        # Re-open after verify() since verify() alters file pointer state
        img = Image.open(BytesIO(image_data))
    except Exception as e:
        raise ValueError(f"Corrupt or unreadable image file: {e}")

    width, height = img.size
    if width < 64 or height < 64:
        raise ValueError(f"Image dimensions ({width}x{height}) are too small. Minimum required: 64x64.")
    if width > 4096 or height > 4096:
        raise ValueError(f"Image dimensions ({width}x{height}) exceed maximum allowed: 4096x4096.")

    return img, {
        "width": width,
        "height": height,
        "format": img.format or ("JPEG" if is_jpeg else "PNG" if is_png else "WEBP"),
        "sizeBytes": len(image_data)
    }


def enrich_prediction(
    class_name: str,
    confidence: float,
    box_pct: Dict[str, float],
    points_pct: Optional[List[Dict[str, float]]] = None,
    pred_id: Optional[str] = None
) -> Dict[str, Any]:
    """Calculate distance, safety status, and navigational speech guidance."""
    lower_class = class_name.lower()
    height_pct = box_pct.get("height", 20.0) / 100.0
    
    # Distance estimation based on visual framing height
    estimated_distance = round(max(0.4, min(4.5, 3.5 - height_pct * 3.0)), 1)

    safety_status = "SAFE"
    guidance = "Clear corridor ahead"

    if any(k in lower_class for k in ["sidewalk", "walkway", "path", "pavement"]):
        safety_status = "SAFE"
        guidance = "Navigable sidewalk confirmed ahead. Safe walking path."
    elif any(k in lower_class for k in ["fall", "fallen", "person fall"]):
        safety_status = "CRITICAL"
        guidance = "Emergency: Fall incident detected. Alerting caregivers."
    elif any(k in lower_class for k in ["car", "truck", "vehicle", "bus", "motorcycle", "van"]):
        safety_status = "CRITICAL"
        guidance = f"Traffic hazard: {class_name.upper()} at {estimated_distance}m. Stand clear of roadway!"
    elif any(k in lower_class for k in ["stair", "curb", "step", "edge", "pothole"]):
        safety_status = "CRITICAL" if estimated_distance < 1.2 else "CAUTION"
        guidance = f"Elevation hazard: {class_name} at ~{estimated_distance}m. Caution on foot placement."
    elif any(k in lower_class for k in ["pedestrian", "person", "human"]):
        safety_status = "CRITICAL" if estimated_distance < 1.2 else "CAUTION"
        guidance = f"Pedestrian ahead at {estimated_distance}m."
    elif any(k in lower_class for k in ["obstacle", "pole", "barrier", "wall", "tree"]):
        safety_status = "CRITICAL" if estimated_distance < 1.2 else "CAUTION"
        guidance = f"Obstacle ({class_name}) detected at {estimated_distance}m."
    else:
        safety_status = "CAUTION" if estimated_distance < 1.5 else "SAFE"
        guidance = f"Detected {class_name} at {estimated_distance}m."

    return {
        "id": pred_id or f"pred-{int(time.time()*1000)}",
        "class": class_name,
        "confidence": round(confidence, 3),
        "safetyStatus": safety_status,
        "estimatedDistance": estimated_distance,
        "guidanceText": guidance,
        "boxPercent": box_pct,
        "pointsPercent": points_pct
    }


def run_local_yolo_inference(image_data: bytes, model_path: Path, confidence_threshold: float = 0.25) -> Dict[str, Any]:
    """Run local YOLO inference using Ultralytics (.pt or .onnx)."""
    from ultralytics import YOLO

    t0 = time.time()
    img, meta = validate_image_bytes(image_data)
    width, height = meta["width"], meta["height"]

    model = YOLO(str(model_path))
    results = model.predict(img, conf=confidence_threshold, verbose=False)

    predictions = []
    has_obstacles = False
    has_navigable = False
    primary_status = "SAFE"

    if len(results) > 0:
        r = results[0]
        boxes = r.boxes
        names = r.names

        for i, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            class_name = names.get(cls_id, f"class_{cls_id}")
            conf = float(box.conf[0].item())

            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy

            box_pct = {
                "left": round((x1 / width) * 100, 2),
                "top": round((y1 / height) * 100, 2),
                "width": round(((x2 - x1) / width) * 100, 2),
                "height": round(((y2 - y1) / height) * 100, 2)
            }

            pred = enrich_prediction(class_name, conf, box_pct, pred_id=f"yolo-{i}")
            predictions.append(pred)

            if pred["safetyStatus"] == "CRITICAL":
                primary_status = "CRITICAL"
                has_obstacles = True
            elif pred["safetyStatus"] == "CAUTION" and primary_status != "CRITICAL":
                primary_status = "CAUTION"
                has_obstacles = True
            elif "sidewalk" in class_name.lower():
                has_navigable = True

    elapsed_ms = int((time.time() - t0) * 1000)

    speech = "Visual scanner active. Path clear."
    if predictions:
        criticals = [p for p in predictions if p["safetyStatus"] == "CRITICAL"]
        if criticals:
            speech = criticals[0]["guidanceText"]
        else:
            speech = predictions[0]["guidanceText"]

    return {
        "success": True,
        "model": model_path.name,
        "modelType": "yolo_local",
        "processingTimeMs": elapsed_ms,
        "imageDimensions": {"width": width, "height": height},
        "predictionsCount": len(predictions),
        "predictions": predictions,
        "summary": {
            "hasObstacles": has_obstacles,
            "hasNavigablePath": has_navigable,
            "primarySafetyStatus": primary_status,
            "speechAnnouncement": speech
        }
    }


def run_roboflow_inference(image_data: bytes, model_id: str = DEFAULT_MODEL_ID, api_key: str = DEFAULT_ROBOFLOW_KEY) -> Dict[str, Any]:
    """Run Roboflow Serverless Cloud Inference."""
    from inference_sdk import InferenceHTTPClient, InferenceConfiguration

    t0 = time.time()
    img, meta = validate_image_bytes(image_data)
    width, height = meta["width"], meta["height"]

    # Encode as JPEG bytes buffer or pass directly
    client = InferenceHTTPClient(
        api_url="https://serverless.roboflow.com",
        api_key=api_key
    ).configure(InferenceConfiguration(
        api_key_transport="header"
    ))

    # Convert to base64 for reliable transmission
    b64 = base64.b64encode(image_data).decode("utf-8")
    result = client.infer(b64, model_id=model_id)

    raw_preds = result.get("predictions", [])
    predictions = []
    has_obstacles = False
    has_navigable = False
    primary_status = "SAFE"

    for i, p in enumerate(raw_preds):
        class_name = p.get("class", "object")
        conf = float(p.get("confidence", 0.8))
        cx = p.get("x", width / 2)
        cy = p.get("y", height / 2)
        w = p.get("width", width * 0.2)
        h = p.get("height", height * 0.2)

        left_px = max(0, cx - w / 2)
        top_px = max(0, cy - h / 2)

        box_pct = {
            "left": round((left_px / width) * 100, 2),
            "top": round((top_px / height) * 100, 2),
            "width": round((w / width) * 100, 2),
            "height": round((h / height) * 100, 2),
        }

        points_pct = None
        if "points" in p and p["points"]:
            points_pct = [
                {
                    "x": round((pt["x"] / width) * 100, 2),
                    "y": round((pt["y"] / height) * 100, 2)
                }
                for pt in p["points"]
            ]

        pred = enrich_prediction(class_name, conf, box_pct, points_pct=points_pct, pred_id=p.get("detection_id", f"rf-{i}"))
        predictions.append(pred)

        if pred["safetyStatus"] == "CRITICAL":
            primary_status = "CRITICAL"
            has_obstacles = True
        elif pred["safetyStatus"] == "CAUTION" and primary_status != "CRITICAL":
            primary_status = "CAUTION"
            has_obstacles = True
        elif "sidewalk" in class_name.lower():
            has_navigable = True

    elapsed_ms = int((time.time() - t0) * 1000)

    speech = "Visual scanner active. Path clear ahead."
    if predictions:
        criticals = [p for p in predictions if p["safetyStatus"] == "CRITICAL"]
        if criticals:
            speech = criticals[0]["guidanceText"]
        else:
            speech = predictions[0]["guidanceText"]

    return {
        "success": True,
        "model": model_id,
        "modelType": "roboflow_serverless",
        "processingTimeMs": elapsed_ms,
        "imageDimensions": {"width": width, "height": height},
        "predictionsCount": len(predictions),
        "predictions": predictions,
        "summary": {
            "hasObstacles": has_obstacles,
            "hasNavigablePath": has_navigable,
            "primarySafetyStatus": primary_status,
            "speechAnnouncement": speech
        }
    }


def execute_inference(image_data: bytes, model_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Route inference to local YOLO model if requested or present,
    otherwise to Roboflow serverless cloud API.
    """
    # 1. Check if model is a local YOLO file (.pt or .onnx)
    target_model = model_id or DEFAULT_MODEL_ID

    # Check for local model file
    local_candidates = [
        Path(target_model),
        MODELS_DIR / target_model,
        MODELS_DIR / f"{target_model}.pt",
        MODELS_DIR / f"{target_model}.onnx",
        Path.cwd() / target_model,
    ]
    for cand in local_candidates:
        if cand.is_file() and cand.suffix in [".pt", ".onnx"]:
            return run_local_yolo_inference(image_data, cand)

    # 2. Otherwise run Roboflow Serverless
    return run_roboflow_inference(image_data, model_id=target_model)


class InferenceHTTPHandler(BaseHTTPRequestHandler):
    """Lightweight HTTP REST API Handler for local inference service."""

    def _send_json(self, status: int, data: Dict[str, Any]):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path in ["/status", "/api/status", "/health"]:
            local_models = []
            if MODELS_DIR.exists():
                local_models = [f.name for f in MODELS_DIR.glob("*") if f.suffix in [".pt", ".onnx"]]

            self._send_json(200, {
                "status": "ONLINE",
                "service": "Nexus AI Blind Stick Inference Service",
                "version": "2.4.1",
                "defaultModel": DEFAULT_MODEL_ID,
                "localYOLOModels": local_models,
                "roboflowConfigured": bool(DEFAULT_ROBOFLOW_KEY),
                "timestamp": time.time()
            })
        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        if self.path not in ["/infer", "/api/infer"]:
            self._send_json(404, {"error": "Endpoint not found"})
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 5 * 1024 * 1024:
            self._send_json(413, {"error": "Payload exceeds 5MB size limit"})
            return

        content_type = self.headers.get("Content-Type", "")
        raw_body = self.rfile.read(content_length)

        try:
            image_bytes: bytes
            model_id: Optional[str] = None

            if "application/json" in content_type:
                payload = json.loads(raw_body.decode("utf-8"))
                b64_str = payload.get("image") or payload.get("frame")
                if not b64_str:
                    self._send_json(400, {"error": "Missing 'image' or 'frame' base64 string in JSON body"})
                    return
                # Strip prefix if present
                if "," in b64_str:
                    b64_str = b64_str.split(",", 1)[1]
                image_bytes = base64.b64decode(b64_str)
                model_id = payload.get("model") or payload.get("modelId")
            else:
                # Raw binary image directly from ESP32-CAM
                image_bytes = raw_body
                model_id = self.headers.get("x-model-id")

            result = execute_inference(image_bytes, model_id=model_id)
            self._send_json(200, result)

        except ValueError as val_err:
            self._send_json(400, {"error": str(val_err)})
        except Exception as err:
            self._send_json(500, {"error": f"Inference execution failed: {err}"})


def serve(port: int = 5002):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, InferenceHTTPHandler)
    print(f"🚀 Nexus Inference Microservice listening on http://127.0.0.1:{port}")
    print(f"⚡ Default Model: {DEFAULT_MODEL_ID}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down inference server.")
        httpd.server_close()


def main():
    parser = argparse.ArgumentParser(description="Nexus Smart Blind Stick Inference Service")
    parser.add_argument("--serve", action="store_true", help="Run HTTP microservice on specified port")
    parser.add_argument("--port", type=int, default=5002, help="HTTP server port (default: 5002)")
    parser.add_argument("--image", "-i", help="Local image path or URL for CLI execution")
    parser.add_argument("--model", "-m", default=DEFAULT_MODEL_ID, help="Model ID or local .pt/.onnx path")
    parser.add_argument("--json", action="store_true", help="Output pure JSON to stdout")

    args = parser.parse_args()

    if args.serve:
        serve(port=args.port)
        return

    if not args.image:
        parser.print_help()
        sys.exit(1)

    img_path = Path(args.image)
    if not img_path.is_file():
        # Check relative to repo
        repo_cand = Path(__file__).resolve().parent.parent / args.image
        if repo_cand.is_file():
            img_path = repo_cand
        else:
            print(f"Error: Image file not found: {args.image}", file=sys.stderr)
            sys.exit(1)

    image_data = img_path.read_bytes()

    try:
        result = execute_inference(image_data, model_id=args.model)
        if args.json:
            print(json.dumps(result))
        else:
            print("\n=== Inference Result ===")
            print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Inference error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
