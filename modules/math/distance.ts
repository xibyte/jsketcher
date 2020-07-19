export function distanceAB(a, b) {
  return distance(a.x, a.y, b.x, b.y);
}

export function distance(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceAB3(a, b) {
  return distance3(a.x, a.y, a.z, b.x, b.y, b.z);
}

export function distance3(x1, y1, z1, x2, y2, z2) {
  return Math.sqrt(distanceSquared3(x1, y1, z1, x2, y2, z2));
}

export function distanceSquaredAB3(a, b) {
  return distanceSquared3(a.x, a.y, a.z, b.x, b.y, b.z);
}

export function distanceSquaredANegB3(a, b) {
  return distanceSquared3(a.x, a.y, a.z, -b.x, -b.y, -b.z);
}

export function distanceSquared3(x1, y1, z1, x2, y2, z2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  var dz = z1 - z2;
  return dx * dx + dy * dy + dz * dz;
}

export function distanceSquared(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}