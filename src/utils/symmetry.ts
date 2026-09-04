import { Point } from './bresenham';

export type SymmetryMode = 'none' | 'horizontal' | 'vertical';

/**
 * Calculates symmetrical points corresponding to (x, y) based on width, height, and active SymmetryMode.
 *
 * - 'none': Returns [{ x, y }]
 * - 'horizontal': Mirrors horizontally across the vertical center line (x' = width - 1 - x, y)
 * - 'vertical': Mirrors vertically across the horizontal center line (x, y' = height - 1 - y)
 */
export function getSymmetricPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  symmetry: SymmetryMode
): Point[] {
  const clampedX = Math.max(0, Math.min(width - 1, Math.round(x)));
  const clampedY = Math.max(0, Math.min(height - 1, Math.round(y)));

  const points: Point[] = [{ x: clampedX, y: clampedY }];

  if (symmetry === 'horizontal') {
    const mirrorX = width - 1 - clampedX;
    if (mirrorX !== clampedX) {
      points.push({ x: mirrorX, y: clampedY });
    }
  } else if (symmetry === 'vertical') {
    const mirrorY = height - 1 - clampedY;
    if (mirrorY !== clampedY) {
      points.push({ x: clampedX, y: mirrorY });
    }
  }

  return points;
}
