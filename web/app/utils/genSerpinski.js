import Vector from 'math/vector';

export default function genSerpinski(viewer, depthLimit = 7) {
  let [line] = viewer.selected;
  genSerpinskiImpl(viewer, line.a, line.b, depthLimit);
  viewer.remove(line);
  viewer.refresh();
}

export function genSerpinskiImpl(viewer, aInit, bInit, depthLimit) {
  function serpinskiStep(a, b) {
    a = new Vector().setV(a);
    b = new Vector().setV(b);

    let ab = b.minus(a);
    let S = ab.length() * 0.5;

    let v = ab.normalize();
    let SH = S * 0.5;
    let dp = v.multiply(SH);
    let p = a.plus(dp);
    let D = new Vector(-v.y, v.x, 0);
    let DL = Math.sqrt(S * S - SH * SH);
    let A = p.plus(D.multiply(DL));

    let B = A.plus(v.multiply(S));
    return [
      [A, a],
      [A, B],
      [b, B],
    ]
  }

  function addLineOnScene(line) {
    let [a, b] = line;
    viewer.addSegment(a.x, a.y, b.x, b.y, viewer.activeLayer)
  }


  function generate(a, b, depth) {
    let lines = serpinskiStep(a, b);
    if (depth === depthLimit) {
      return lines;
    }
    let subLines = [];
    let [l1, l2, l3] = lines;
    generate(l1[0], l1[1], depth + 1).forEach(sl => subLines.push(sl));
    generate(l2[0], l2[1], depth + 1).forEach(sl => subLines.push(sl));
    generate(l3[0], l3[1], depth + 1).forEach(sl => subLines.push(sl));

    return subLines;
  }

  let lines = generate(aInit, bInit, 1);

  lines.forEach(l => addLineOnScene(l));
}
