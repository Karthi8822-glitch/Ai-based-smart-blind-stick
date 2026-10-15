#!/usr/bin/env node

/**
 * Roboflow Instance Segmentation Inference Runner
 * Model: "pedestrian-viewer/4"
 * 
 * Usage:
 *   node scripts/run-inference.js [path-to-image-or-url]
 * 
 * Examples:
 *   node scripts/run-inference.js 3.jpg
 *   node scripts/run-inference.js 1.jpg
 *   node scripts/run-inference.js https://images.unsplash.com/photo-1519741497674-611481863552?w=800
 */

const fs = require('fs');
const path = require('path');

// 1. Load environment variables from server/.env or root .env
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../server/.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      break;
    }
  }
}

loadEnv();

const API_KEY = process.env.ROBOFLOW_API_KEY;
const MODEL_ID = process.env.ROBOFLOW_MODEL_ID || 'pedestrian-viewer/4';

if (!API_KEY) {
  console.error('\n❌ ERROR: ROBOFLOW_API_KEY environment variable is missing.');
  console.error('Please configure ROBOFLOW_API_KEY in server/.env\n');
  process.exit(1);
}

// 2. Determine target image
const targetArg = process.argv[2] || '3.jpg';

async function getImageBase64(source) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    console.log(`🌐 Fetching remote image from: ${source}`);
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to download remote image: HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }

  // Local file resolution
  const resolvedPath = path.isAbsolute(source) ? source : path.resolve(process.cwd(), source);
  if (!fs.existsSync(resolvedPath)) {
    // Try checking workspace root
    const rootPath = path.resolve(__dirname, '..', source);
    if (fs.existsSync(rootPath)) {
      console.log(`📁 Reading local image: ${rootPath}`);
      return fs.readFileSync(rootPath, { encoding: 'base64' });
    }
    throw new Error(`File not found: ${resolvedPath}`);
  }

  console.log(`📁 Reading local image: ${resolvedPath}`);
  return fs.readFileSync(resolvedPath, { encoding: 'base64' });
}

async function runInference() {
  console.log('\n======================================================');
  console.log('👁️  NOVOS AI SMART BLIND STICK - ROBOFLOW INFERENCE');
  console.log(`🤖 Model: ${MODEL_ID} (Instance Segmentation)`);
  console.log(`🎯 Input: ${targetArg}`);
  console.log('======================================================\n');

  try {
    const base64Image = await getImageBase64(targetArg);
    console.log('⚡ Sending base64 payload to Roboflow Serverless Cloud API...');
    const startTime = Date.now();

    const response = await fetch(`https://serverless.roboflow.com/${MODEL_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: base64Image
    });

    const elapsedMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errText}`);
    }

    const data = await response.json();

    // 1. Output the raw data (as required by prompt)
    console.log('\n--- [ RAW JSON RESPONSE ] ---');
    console.log(JSON.stringify(data, null, 2));

    // 2. Formatted summary analysis for Smart Blind Stick context
    console.log('\n--- [ INFERENCE SUMMARY & SPATIAL PERCEPTION ] ---');
    console.log(`⏱️  Latency: ${elapsedMs}ms (API Server Time: ${(data.time * 1000).toFixed(1)}ms)`);
    console.log(`📐 Image Dimensions: ${data.image?.width || 'N/A'} x ${data.image?.height || 'N/A'}`);
    console.log(`🎯 Detections Count: ${data.predictions ? data.predictions.length : 0}`);

    if (data.predictions && data.predictions.length > 0) {
      console.log('\nDetected Instances:');
      data.predictions.forEach((pred, idx) => {
        const confPercent = (pred.confidence * 100).toFixed(1);
        const polygonPoints = pred.points ? pred.points.length : 0;
        
        // Approximate distance estimation based on bounding box height relative to image height
        const imgH = data.image?.height || 1000;
        const relativeH = pred.height / imgH;
        let estimatedDistance = Number((3.5 - (relativeH * 3.0)).toFixed(1));
        if (estimatedDistance < 0.5) estimatedDistance = 0.5;

        // Navigation guidance
        let navStatus = 'SAFE';
        let advice = 'Path clear for traversal';
        if (pred.class.toLowerCase().includes('sidewalk') || pred.class.toLowerCase().includes('walkway')) {
          navStatus = 'NAVIGABLE PATH';
          advice = 'Safe walkable corridor identified';
        } else if (pred.class.toLowerCase().includes('pedestrian') || pred.class.toLowerCase().includes('person')) {
          navStatus = 'CAUTION';
          advice = `Pedestrian detected ahead at ~${estimatedDistance}m`;
        } else if (pred.class.toLowerCase().includes('obstacle')) {
          navStatus = 'CRITICAL HAZARD';
          advice = `Obstacle blocking path at ~${estimatedDistance}m. Trigger haptic pulse!`;
        } else if (pred.class.toLowerCase().includes('verge')) {
          navStatus = 'MARGIN BORDER';
          advice = 'Path edge / curb boundary detected';
        }

        console.log(`  [#${idx + 1}] Class: ${pred.class.toUpperCase()} (${confPercent}%)`);
        console.log(`      Box: center(${pred.x.toFixed(0)}, ${pred.y.toFixed(0)}), size(${pred.width.toFixed(0)}x${pred.height.toFixed(0)})`);
        console.log(`      Polygon Mask Points: ${polygonPoints}`);
        console.log(`      Status: ${navStatus}`);
        console.log(`      Smart Stick Guidance: ${advice}\n`);
      });
    } else {
      console.log('\n✅ No obstacles detected in this frame. Path open.');
    }

    console.log('======================================================\n');
    return data;
  } catch (error) {
    console.error('\n❌ Roboflow Inference Error:', error.message);
    process.exit(1);
  }
}

runInference();
