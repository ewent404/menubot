import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";

import { menuItems } from "../src/menuData.js";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readChunks(buffer) {
  const chunks = [];
  let offset = pngSignature.length;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    chunks.push({ type, data: buffer.subarray(dataStart, dataEnd) });
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }

  return chunks;
}

function bytesPerPixel(colorType) {
  if (colorType === 6) return 4;
  if (colorType === 4) return 2;
  if (colorType === 2) return 3;
  throw new Error(`Unsupported PNG color type. colorType=${colorType}`);
}

function unfilterScanline(filter, current, previous, bpp) {
  const result = Buffer.from(current);

  for (let index = 0; index < result.length; index += 1) {
    const left = index >= bpp ? result[index - bpp] : 0;
    const up = previous ? previous[index] : 0;
    const upLeft = previous && index >= bpp ? previous[index - bpp] : 0;

    if (filter === 1) {
      result[index] = (result[index] + left) & 255;
    } else if (filter === 2) {
      result[index] = (result[index] + up) & 255;
    } else if (filter === 3) {
      result[index] = (result[index] + Math.floor((left + up) / 2)) & 255;
    } else if (filter === 4) {
      const predictor = left + up - upLeft;
      const leftDistance = Math.abs(predictor - left);
      const upDistance = Math.abs(predictor - up);
      const upLeftDistance = Math.abs(predictor - upLeft);
      const paeth = leftDistance <= upDistance && leftDistance <= upLeftDistance
        ? left
        : upDistance <= upLeftDistance
          ? up
          : upLeft;
      result[index] = (result[index] + paeth) & 255;
    }
  }

  return result;
}

async function readPngAlpha(path) {
  const buffer = await readFile(path);
  assert.equal(buffer.subarray(0, pngSignature.length).equals(pngSignature), true);

  const chunks = readChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr.readUInt8(8);
  const colorType = ihdr.readUInt8(9);
  assert.equal(bitDepth, 8);

  const bpp = bytesPerPixel(colorType);
  const inflated = inflateSync(Buffer.concat(
    chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data),
  ));
  const stride = width * bpp;
  let previous;
  let nonTransparentPixels = 0;

  for (let y = 0; y < height; y += 1) {
    const lineStart = y * (stride + 1);
    const filter = inflated[lineStart];
    const rawLine = inflated.subarray(lineStart + 1, lineStart + 1 + stride);
    const line = unfilterScanline(filter, rawLine, previous, bpp);
    if (colorType === 2) {
      nonTransparentPixels += width;
    } else {
      const alphaOffset = bpp - 1;
      for (let x = alphaOffset; x < line.length; x += bpp) {
        if (line[x] > 0) nonTransparentPixels += 1;
      }
    }

    previous = line;
  }

  return { colorType, nonTransparentPixels, totalPixels: width * height };
}

test("all product photos are web-optimized images with visible product content", async () => {
  const photoPaths = new Set(
    menuItems.flatMap((item) => item.photos.map((photo) => photo.src)),
  );

  for (const photoPath of photoPaths) {
    assert.match(photoPath, /^\.\/products\/[a-z0-9-]+(?:-\d+)?\.(png|webp|jpg)$/);
    const assetPath = resolve("public", photoPath.replace("./", ""));
    const assetStat = await stat(assetPath);
    assert.ok(
      assetStat.size <= 450_000,
      `${photoPath} should be compressed for Telegram Mini App load speed`,
    );

    if (!photoPath.endsWith(".png")) continue;

    const { nonTransparentPixels, totalPixels } = await readPngAlpha(assetPath);
    assert.ok(
      totalPixels >= 1_000_000,
      `${photoPath} should stay high resolution for product display`,
    );
    assert.ok(
      nonTransparentPixels / totalPixels > 0.12,
      `${photoPath} should include enough visible product pixels`,
    );
  }
});
