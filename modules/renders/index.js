
const renderXZY = (x, y, z) => `[${x}, ${y}, ${z}]`;

export function renderPoint(point) {
  if (arguments.length > 1) {
    let [x, y, z] = arguments;
    return renderXZY(x, y, z);
  } else if (Array.isArray(point)) {
    let [x, y, z] = point;
    return renderXZY(x, y, z);
  } else {
    let {x, y, z} = point;
    return renderXZY(x, y, z);
  }
}

