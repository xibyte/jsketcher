export default function pertrub([x, y, z], angleStep) {

  //convert to spherical coordinate system
  let r = Math.sqrt(x*x + y*y + z*z);
  let teta = Math.acos(z / r);
  let phi = Math.atan2(y, x);

  phi = anglePertrub(phi, angleStep);
  teta = anglePertrub(teta, angleStep);
  return [
    r * Math.sin(teta) * Math.cos(phi),
    r * Math.sin(teta) * Math.sin(phi),
    r * Math.cos(teta),
  ];

}

const _2PI = 2 * Math.PI;

function anglePertrub(angle, angleStep) {
	return (angle + 0.75 * Math.PI + angleStep/_2PI) % _2PI;
}
