/**
 * 2D Canvas Flood Fill Algorithm with tolerance support.
 * Operates directly on an HTML5 Canvas 2D Context.
 */
export function canvasFloodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance = 32
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  const clampedX = Math.floor(Math.max(0, Math.min(width - 1, startX)));
  const clampedY = Math.floor(Math.max(0, Math.min(height - 1, startY)));

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert hex to RGBA
  const fillR = parseInt(fillColorHex.slice(1, 3), 16) || 0;
  const fillG = parseInt(fillColorHex.slice(3, 5), 16) || 0;
  const fillB = parseInt(fillColorHex.slice(5, 7), 16) || 0;
  const fillA = 255;

  const startIndex = (clampedY * width + clampedX) * 4;
  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];

  // If already the same color, early return
  if (
    Math.abs(targetR - fillR) <= 2 &&
    Math.abs(targetG - fillG) <= 2 &&
    Math.abs(targetB - fillB) <= 2 &&
    Math.abs(targetA - fillA) <= 2
  ) {
    return;
  }

  const matchColor = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    return (
      Math.abs(r - targetR) <= tolerance &&
      Math.abs(g - targetG) <= tolerance &&
      Math.abs(b - targetB) <= tolerance &&
      Math.abs(a - targetA) <= tolerance
    );
  };

  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const queue: number[] = [clampedY * width + clampedX];
  visited[clampedY * width + clampedX] = 1;

  while (queue.length > 0) {
    const pixelPos = queue.pop()!;
    const px = pixelPos % width;
    const py = Math.floor(pixelPos / width);
    const dataIdx = pixelPos * 4;

    data[dataIdx] = fillR;
    data[dataIdx + 1] = fillG;
    data[dataIdx + 2] = fillB;
    data[dataIdx + 3] = fillA;

    const neighbors = [
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos]) {
          visited[nPos] = 1;
          if (matchColor(nPos * 4)) {
            queue.push(nPos);
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
