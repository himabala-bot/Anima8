export interface Point {
  x: number;
  y: number;
}

/**
 * Bresenham's Line Algorithm
 * Calculates continuous integer pixel coordinates between two points (x0, y0) and (x1, y1).
 * Ensures that fast pointer drags leave no gaps in the stroke.
 */
export function getBresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Point[] {
  const points: Point[] = [];
  
  let currX = Math.round(x0);
  let currY = Math.round(y0);
  const targetX = Math.round(x1);
  const targetY = Math.round(y1);

  const dx = Math.abs(targetX - currX);
  const dy = Math.abs(targetY - currY);
  const sx = currX < targetX ? 1 : -1;
  const sy = currY < targetY ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: currX, y: currY });

    if (currX === targetX && currY === targetY) {
      break;
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }

  return points;
}
