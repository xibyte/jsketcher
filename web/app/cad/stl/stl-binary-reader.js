import {StlSolid, StlFace} from './stl-data-structure'

function readVector(dataView, off) {
  return [
    dataView.getFloat32(off + 0, true),
    dataView.getFloat32(off + 4, true),
    dataView.getFloat32(off + 8, true)
  ];
}

export function parse(dataView) {
  const solid = new StlSolid('binary');
  let off = 80; // skip header

  let triangleCount = dataView.getUint32(off, true);
  off += 4;

  for (let i = 0; i < triangleCount; i++) {
    let normal = readVector(dataView, off);
    off += 12; // 3 floats

    let face = new StlFace(normal);

    for (let j = 0; j < 3; j++) {
      let position = readVector(dataView, off);
      off += 12;
      face.vertices.push(position);
    }
    solid.faces.push(face);
    off += 2; // skip attribute byte count
  }
  return solid;
}