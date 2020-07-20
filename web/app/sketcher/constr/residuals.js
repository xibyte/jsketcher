import {sq} from "math/commons";

export function R_Equal(params, [value]) {

  return {

    params,

    error: () => params[0].get() - value,

    gradient: out => {
      out[0] = 1;
    }
  };
}

export function R_TangentLC(params, [inverted]) {

  const ANG = 0;
  const W = 1;

  const CX = 2;
  const CY = 3;
  const R = 4;

  const k = inverted ? -1 : 1;

  return {

    params,

    error: () => {

      const ang = params[ANG].get();
      const w = params[W].get();
      const cx = params[CX].get();
      const cy = params[CY].get();
      const r = params[R].get();

      let nx = Math.cos(ang) ;
      let ny = Math.sin(ang) ;


      return (cx*nx + cy*ny) - (w+k*r);
    },

    gradient: out => {
      const ang = params[ANG].get();
      // const w = params[W].get();
      const cx = params[CX].get();
      const cy = params[CY].get();
      const r = params[R].get();

      out[ANG] = cy * Math.cos(ang) - cx * Math.sin(ang);
      out[W] = -1;
      out[CX] = Math.cos(ang);
      out[CY] = Math.sin(ang);
      out[R] = -k;
    }

  };
}

export function R_PointOnLine(params, constants) {

  const PX = 0;
  const PY = 1;

  const ANG = 2;
  const W = 3;

  return {

    params,

    error: () => {

      const px = params[PX].get();
      const py = params[PY].get();
      const ang = params[ANG].get();
      const w = params[W].get();


      let nx = Math.cos(ang) ;
      let ny = Math.sin(ang) ;

      return px * nx + py * ny - w;

    },

    gradient: out => {
      const px = params[PX].get();
      const py = params[PY].get();
      const ang = params[ANG].get();

      out[PX] = Math.cos(ang);
      out[PY] = Math.sin(ang);
      out[ANG] = py * Math.cos(ang) - px * Math.sin(ang);
      out[W] = -1;

    }
  };
}

export function R_DistancePP(params, [dist]) {

  const AX = 0;
  const AY = 1;

  const BX = 2;
  const BY = 3;

  return {

    params,

    error: () => {

      const ax = params[AX].get();
      const ay = params[AY].get();
      const bx = params[BX].get();
      const by = params[BY].get();

      const dx = bx - ax;
      const dy = by - ay;

      return sq(dx) + sq(dy) - sq(dist);

    },

    gradient: out => {

      const ax = params[AX].get();
      const ay = params[AY].get();
      const bx = params[BX].get();
      const by = params[BY].get();

      out[AX] = 2 * ax - 2 * bx;
      out[AY] = 2 * ay - 2 * by;

      out[BX] = 2 * bx - 2 * ax;
      out[BY] = 2 * by - 2 * ay;
    },
    // gradient:NumericGradient
  };
}
