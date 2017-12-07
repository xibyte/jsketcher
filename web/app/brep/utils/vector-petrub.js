export default function pertrub([x, y, z]) {

  let s = x + y + z;
  x = pertrubFloat(x + 3 + s);
  y = pertrubFloat(y + 5 + s);
  z = pertrubFloat(z + 7 + s);

  let r = Math.sqrt(x*x + y*y + z*z);

  return [
    x/r,
    y/r,
    z/r
  ];
}

function pertrubFloat(x) {
  return xorshift32(Math.round(x * 1e8)) ;
}

function xorshift32(x) {
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return x;
}

