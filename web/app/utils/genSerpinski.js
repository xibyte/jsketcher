import Vector from 'math/vector';

export default function genSerpinski(viewer, depthLimit = 7) {
  const [line] = viewer.selected;
  genSerpinskiImpl(viewer, line.a, line.b, depthLimit);
  viewer.remove(line);
  viewer.refresh();
}

export function genSerpinskiImpl(viewer, aInit, bInit, depthLimit) {
  function serpinskiStep(a, b) {
    a = new Vector().setV(a);
    b = new Vector().setV(b);

    const ab = b.minus(a);
    const S = ab.length() * 0.5;

    const v = ab.normalize();
    const SH = S * 0.5;
    const dp = v.multiply(SH);
    const p = a.plus(dp);
    const D = new Vector(-v.y, v.x, 0);
    const DL = Math.sqrt(S * S - SH * SH);
    const A = p.plus(D.multiply(DL));

    const B = A.plus(v.multiply(S));
    return [
      [A, a],
      [A, B],
      [b, B],
    ]
  }

  function addLineOnScene(line) {
    const [a, b] = line;
    viewer.addSegment(a.x, a.y, b.x, b.y, viewer.activeLayer)
  }


  function generate(a, b, depth) {
    const lines = serpinskiStep(a, b);
    if (depth === depthLimit) {
      return lines;
    }
    const subLines = [];
    const [l1, l2, l3] = lines;
    generate(l1[0], l1[1], depth + 1).forEach(sl => subLines.push(sl));
    generate(l2[0], l2[1], depth + 1).forEach(sl => subLines.push(sl));
    generate(l3[0], l3[1], depth + 1).forEach(sl => subLines.push(sl));

    return subLines;
  }

  const lines = generate(aInit, bInit, 1);

  lines.forEach(l => addLineOnScene(l));
}
