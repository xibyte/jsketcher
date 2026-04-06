/**
 * Minimal Vec3 math for patch cage operations.
 */

export type Vec3 = [number, number, number];

export function vadd(a: Vec3, b: Vec3): Vec3 {
  return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
}

export function vsub(a: Vec3, b: Vec3): Vec3 {
  return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}

export function vscale(a: Vec3, s: number): Vec3 {
  return [a[0]*s, a[1]*s, a[2]*s];
}

export function vlerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
}

export function vlength(a: Vec3): number {
  return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
}

export function vnormalize(a: Vec3): Vec3 {
  const l = vlength(a);
  return l > 0 ? [a[0]/l, a[1]/l, a[2]/l] : [0, 0, 0];
}

export function vdist(a: Vec3, b: Vec3): number {
  return vlength(vsub(a, b));
}

export function vcross(a: Vec3, b: Vec3): Vec3 {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}

export function vdot(a: Vec3, b: Vec3): number {
  return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
}
