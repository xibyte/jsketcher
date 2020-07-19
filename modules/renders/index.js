
const colorCode = (x, y, z) => '#' + hex(x) + hex(y) + hex(z);

const renderText = (x, y, z) => `[${x}, ${y}, ${z}]`;

export function pointAsColor(point) {
  return renderPointImpl(point, colorCode);
}

export function pointAsText(point) {
  return renderPointImpl(point, renderText);
}

export function renderPointImpl(point, renderer) {
  if (Array.isArray(point)) {
    let [x, y, z] = point;
    return renderer(x, y, z);
  } else {
    let {x, y, z} = point;
    return renderer(x, y, z);
  }
}

function toInt(num) {
  return Math.round(parseFloat(num) || 0);
}

const hex = v => {
  let r = toInt(v) % 255;
  let s = r.toString(16);
  if (s.length === 1) {
    s = '0' + s;
  }
  return s;
};