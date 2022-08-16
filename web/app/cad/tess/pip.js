import {areEqual} from "math/equality";

export default function(outerLoop, innerLoops, tol) {

  tol = tol || 1e-6;

  function eq(a, b) {
    return areEqual(a, b, tol);
  }

  function veq(a, b) {
    return eq(a.x, b.x) && eq(a.y, b.y);
  }

  function classifyPointInsideLoop( pt, loop ) {

    function VertexResult(vertex) {
      this.inside = true;
      this.vertex = vertex;
    }

    function EdgeResult(edge) {
      this.inside = true;
      this.edge = edge;
    }

    for( const pt2 of loop ) {
      if (veq(pt, pt2)) {
        return new VertexResult(pt2);
      }
    }
    const grads = [];
    const n = loop.length;
    for (let i = 0; i < n; ++i) {
      const j = (i + 1) % n;
      const a = loop[i];
      const b = loop[j];
      const dy = b.y - a.y;
      if (eq(dy, 0)) {
        grads.push(0)
      } else if (dy > 0) {
        grads.push(1)
      } else {
        grads.push(-1)
      }
    }

    function nextGrad(start) {
      for(let i = 0; i < grads.length; ++i) {
        const idx = (i + start + 1) % grads.length;
        if (grads[idx] !== 0) {
          return grads[idx];
        }
      }
    }

    function prevGrad(start) {
      for(let i = 0; i < grads.length; ++i) {
        const idx = (start - i - 1 + grads.length) % grads.length;
        if (grads[idx] !== 0) {
          return grads[idx];
        }
      }
    }

    const skip = new Set();

    let inside = false;
    for (let i = 0; i < n; ++i) {
      const j = (i + 1) % n;
      const a = loop[i];
      const b = loop[j];

      const shouldBeSkipped = skip.has(a) || skip.has(b);

      const aEq = eq(pt.y, a.y);
      const bEq = eq(pt.y, b.y);

      if (aEq) {
        skip.add(a);
      }
      if (bEq) {
        skip.add(b);
      }

      if (veq(a, b)) {
        console.error('unable to classify invalid polygon');
      }

      let edgeLowPt  = a;
      let edgeHighPt = b;

      let edgeDx = edgeHighPt.x - edgeLowPt.x;
      let edgeDy = edgeHighPt.y - edgeLowPt.y;

      if (aEq && bEq) {
        if ( ( ( edgeHighPt.x <= pt.x ) && ( pt.x <= edgeLowPt.x  ) ) ||
             ( ( edgeLowPt.x  <= pt.x ) && ( pt.x <= edgeHighPt.x ) ) ) {
          return new EdgeResult([a, b]);
        } else {
          continue;
        }
      }

      if (shouldBeSkipped) {
        continue;
      }

      if ( edgeDy < 0 ) {
        edgeLowPt  = b; edgeDx = - edgeDx;
        edgeHighPt = a; edgeDy = - edgeDy;
      }
      if (!aEq && !bEq && ( pt.y < edgeLowPt.y || pt.y > edgeHighPt.y ) ) {
        continue;
      }

      if (bEq) {
        if (grads[i] * nextGrad(i) < 0) {
          continue;
        }
      } else if (aEq) {
        if (grads[i] * prevGrad(i) < 0) {
          continue;
        }
      }

        const perpEdge = edgeDx * (pt.y - edgeLowPt.y) - edgeDy * (pt.x - edgeLowPt.x);
        if ( eq(perpEdge, 0) ) return new EdgeResult([a, b]);
        if ( perpEdge < 0 ) {
          continue;
        }
        inside = ! inside;		// true intersection left of pt
    }
    return	{inside};
  }

  return function classifyPointInsideLoops(pt) {
    const outer = classifyPointInsideLoop(pt, outerLoop);
    if (outer.inside) {
      if (outer.vertex || outer.edge) {
        return outer;
      }
    }

    if (innerLoops) {
      for (const innerLoop of innerLoops) {
        const inner = classifyPointInsideLoop(pt, innerLoop);
        if (inner.vertex || inner.edge) {
          return inner;
        }
        if (inner.inside) {
          return {inside: false};
        }
      }
    }

    return outer;
  }
}