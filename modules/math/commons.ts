export const _360 = 2 * Math.PI;
export const _90 = 0.5 * Math.PI;
export const _270 = 1.5 * Math.PI;

export function makeAngle0_360(angle) {
  angle %= _360;
  if (angle < 0) {
    angle = _360 + angle;
  }
  return angle;
} 

export const DEG_RAD = Math.PI / 180.0;

export const sq = (a) => a * a;

export function clamp(num, min, max) {
  return Math.min(max, Math.max(num, min))
}
