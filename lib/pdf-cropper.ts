// lib/pdf-cropper.ts
// Helper to render a PDF page and crop a region into a PNG buffer

// lib/pdf-cropper.ts
// Helper to render a PDF page and crop a region into a PNG buffer

// @ts-ignore - pdfjs types are messy
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs"; // <-- use .mjs entry
import { createCanvas } from "canvas";
import sharp from "sharp";


export type NormalizedCropBox = {
  x: number; // 0–1 from left
  y: number; // 0–1 from top
  width: number; // 0–1 of page width
  height: number; // 0–1 of page height
};

/**
 * Render a single PDF page and crop a normalized region to PNG.
 * pdfData: ArrayBuffer of the original PDF file
 * pageNumber: 1-based page index
 * box: normalized crop box (0–1 coordinates)
 */
export async function cropRegionFromPdf(
  pdfData: ArrayBuffer,
  pageNumber: number,
  box: NormalizedCropBox
): Promise<Buffer> {
  // Load PDF from memory
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  // Render page at 2x scale for better quality
  const scale = 2.0;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  // @ts-ignore
  const renderContext = { canvasContext: context, viewport };
  // @ts-ignore
  await page.render(renderContext).promise;

  // Full page PNG
  const fullPngBuffer = canvas.toBuffer("image/png");

  // Convert normalized 0–1 coords to pixels
  const fullWidth = viewport.width;
  const fullHeight = viewport.height;

  const left = Math.round(box.x * fullWidth);
  const top = Math.round(box.y * fullHeight);
  const width = Math.round(box.width * fullWidth);
  const height = Math.round(box.height * fullHeight);

  // Safety clamps
  const safeLeft = Math.max(0, Math.min(left, fullWidth - 1));
  const safeTop = Math.max(0, Math.min(top, fullHeight - 1));
  const safeWidth = Math.max(1, Math.min(width, fullWidth - safeLeft));
  const safeHeight = Math.max(1, Math.min(height, fullHeight - safeTop));

  // Crop using sharp
  const cropped = await sharp(fullPngBuffer)
    .extract({
      left: safeLeft,
      top: safeTop,
      width: safeWidth,
      height: safeHeight,
    })
    .png()
    .toBuffer();

  return cropped;
}
