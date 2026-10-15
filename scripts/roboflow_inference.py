#!/usr/bin/env python3
"""
Roboflow Serverless Cloud Inference Runner for NOVOS Smart Blind Stick
Supported Models:
  - "pedestrian-viewer/4"     : Pedestrian & Walkway Instance Segmentation
  - "vechile-zleex/2"         : Vehicle & Traffic Detection
  - "fall-detection-ca3o8/4"  : Fall & Emergency Caregiver Detection
"""
import os
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# 1. Load API key from server/.env, .env, or environment
env_paths = [
    Path(__file__).resolve().parent.parent / "server" / ".env",
    Path(__file__).resolve().parent.parent / ".env",
]
for p in env_paths:
    if p.exists():
        load_dotenv(dotenv_path=p)

DEFAULT_API_KEY = os.getenv("ROBOFLOW_API_KEY", "zMRTKGJi7FR4h3ibIC08")
DEFAULT_MODEL = os.getenv("ROBOFLOW_MODEL_ID", "pedestrian-viewer/4")

parser = argparse.ArgumentParser(description="Run Roboflow Computer Vision Inference on an Image")
parser.add_argument("image", nargs="?", default="1.jpg", help="Path to local image or image URL (default: 1.jpg)")
parser.add_argument("--model", "-m", default=DEFAULT_MODEL, help="Model ID (e.g., vechile-zleex/2, fall-detection-ca3o8/4, pedestrian-viewer/4)")
parser.add_argument("--api-key", "-k", default=DEFAULT_API_KEY, help="Roboflow Private API Key (defaults to env var)")

args = parser.parse_args()

image_path = args.image
model_id = args.model
api_key = args.api_key

# If relative local path, resolve relative to project root
if not (image_path.startswith("http://") or image_path.startswith("https://")):
    if not os.path.isabs(image_path):
        root_img = Path(__file__).resolve().parent.parent / image_path
        if root_img.exists():
            image_path = str(root_img)

from inference_sdk import InferenceHTTPClient, InferenceConfiguration

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=api_key
).configure(InferenceConfiguration(
    api_key_transport="header"  # header-based auth (inference v1.5.0+)
))

print(f"\n=======================================================")
print(f"🤖 Roboflow Model: {model_id}")
print(f"🖼️  Target Image  : {image_path}")
print(f"🔒 Auth Transport: Header (Authorization: Bearer [SECURED])")
print(f"=======================================================\n")

try:
    result = CLIENT.infer(image_path, model_id=model_id)
    print("--- Model Inference Result (JSON) ---")
    print(json.dumps(result, indent=2))
except Exception as e:
    print("--- Roboflow API Error Response ---")
    print(f"Error: {e}")
    if "404" in str(e):
        print(f"\n⚠️  Roboflow Note: Model '{model_id}' was not found on Roboflow Serverless API (HTTP 404).")
        print("This typically occurs if the project was set to private or removed by its original author on Roboflow Universe.")
