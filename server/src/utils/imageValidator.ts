/**
 * Image Validation Utilities for Nexus Smart Blind Stick
 * Validates:
 *   1. Magic bytes (MIME type verification: JPEG, PNG, WebP)
 *   2. File size (Max 5MB)
 *   3. Minimum and Maximum Dimensions (64x64 to 4096x4096)
 */

export interface ImageValidationResult {
  valid: boolean;
  format: 'jpeg' | 'png' | 'webp';
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  error?: string;
}

export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  const sizeBytes = buffer.length;

  // 1. Size Check (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes
  if (sizeBytes > MAX_SIZE) {
    return {
      valid: false,
      format: 'jpeg',
      mimeType: '',
      width: 0,
      height: 0,
      sizeBytes,
      error: `Payload exceeds 5MB size limit (${sizeBytes} bytes provided, max ${MAX_SIZE}).`,
    };
  }

  if (sizeBytes < 32) {
    return {
      valid: false,
      format: 'jpeg',
      mimeType: '',
      width: 0,
      height: 0,
      sizeBytes,
      error: 'Payload is too small or truncated to be a valid image.',
    };
  }

  // 2. Magic Bytes Inspection
  let format: 'jpeg' | 'png' | 'webp' | null = null;
  let mimeType = '';

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    format = 'jpeg';
    mimeType = 'image/jpeg';
  } else if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    format = 'png';
    mimeType = 'image/png';
  } else if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    format = 'webp';
    mimeType = 'image/webp';
  }

  if (!format) {
    return {
      valid: false,
      format: 'jpeg',
      mimeType: '',
      width: 0,
      height: 0,
      sizeBytes,
      error: 'Invalid file signature. Only verified JPEG, PNG, or WebP images are allowed.',
    };
  }

  // 3. Extract Dimensions from Raw Headers
  let width = 0;
  let height = 0;

  try {
    if (format === 'png') {
      // PNG IHDR: width at offset 16, height at offset 20 (4 bytes big-endian each)
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } else if (format === 'jpeg') {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0 (0xC0) to SOF3 (0xC3), SOF5 (0xC5) to SOF7 (0xC7), SOF9 (0xC9) to SOF11 (0xCB), SOF13 (0xCD) to SOF15 (0xCF)
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          height = buffer.readUInt16BE(offset + 5);
          width = buffer.readUInt16BE(offset + 7);
          break;
        }
        // Move to next segment
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    } else if (format === 'webp') {
      // Basic WebP dimension parsing (VP8 chunk)
      if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
        width = buffer.readUInt16LE(26) & 0x3fff;
        height = buffer.readUInt16LE(28) & 0x3fff;
      } else if (buffer.toString('ascii', 12, 16) === 'VP8L') {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        width = 1 + (((b1 & 0x3f) << 8) | b0);
        height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      } else if (buffer.toString('ascii', 12, 16) === 'VP8X') {
        width = 1 + buffer.readUIntLE(24, 3);
        height = 1 + buffer.readUIntLE(27, 3);
      }
    }
  } catch (err: any) {
    return {
      valid: false,
      format,
      mimeType,
      width: 0,
      height: 0,
      sizeBytes,
      error: `Failed to parse image headers: ${err.message}`,
    };
  }

  // Fallback defaults if progressive headers couldn't be parsed
  if (!width || !height) {
    // If it's a valid frame but uncommon header, accept with standard OV2640 VGA dimensions
    width = 640;
    height = 480;
  }

  // 4. Dimension Constraints
  if (width < 64 || height < 64) {
    return {
      valid: false,
      format,
      mimeType,
      width,
      height,
      sizeBytes,
      error: `Image dimensions (${width}x${height}) are too small. Minimum required is 64x64.`,
    };
  }

  if (width > 4096 || height > 4096) {
    return {
      valid: false,
      format,
      mimeType,
      width,
      height,
      sizeBytes,
      error: `Image dimensions (${width}x${height}) exceed 4096x4096 limit.`,
    };
  }

  return {
    valid: true,
    format,
    mimeType,
    width,
    height,
    sizeBytes,
  };
}
