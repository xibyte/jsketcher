import {_270, _90, makeAngle0_360} from "math/commons";
import {_negate} from "math/vec";
import {pointToLineSignedDistance} from "geom/euclidean";

export class TextHelper {

  constructor() {
    this.fontSize = 12;
    this.textRect = [];
  }

  prepare(txt, ctx, viewer) {
    ctx.font = (this.fontSize) + "px Arial";
    this.textMetrics = ctx.measureText(txt);
    this.modelTextWidth = viewer.screenToModelDistance(this.textMetrics.width);
    this.txt = txt;
  }

  draw(tx, ty, nx, ny, ctx, unscale, viewer, flipOffset, staticFlip = false) {

    ctx.save();
    let rot = makeAngle0_360(Math.atan2(-nx, ny));
    const flip = rot > _90 && rot < _270;
    if (flip) {
      rot += Math.PI;
    }

    const modelTextWidth = this.modelTextWidth;
    const modelTextHeight = viewer.screenToModelDistance(this.fontSize);

    const dtx = [modelTextWidth * ny, -nx * modelTextWidth];
    const dty = [modelTextHeight * nx, ny * modelTextHeight];

    if (flip) {
      tx +=  ny * modelTextWidth;
      ty += -nx * modelTextWidth;
      const k = staticFlip ? 1.5 : -1;
      tx += k * nx * 2 *flipOffset;
      ty += k * ny * 2 *flipOffset;

      _negate(dtx);
      _negate(dty);
    }

    this.saveTextRect(tx, ty,
      tx + dtx[0], ty + dtx[1],
      tx + dtx[0] + dty[0], ty + dtx[1] + dty[1],
      tx + dty[0], ty + dty[1],
    );

    ctx.translate(tx, ty);

    ctx.rotate(rot);
    ctx.scale(unscale, -unscale);
    ctx.fillText(this.txt, 0, 0);
    ctx.restore();

  }

  saveTextRect(ax, ay, bx, by, cx, cy, dx, dy) {
    this.textRect[0] = ax;
    this.textRect[1] = ay;
    this.textRect[2] = bx;
    this.textRect[3] = by;
    this.textRect[4] = cx;
    this.textRect[5] = cy;
    this.textRect[6] = dx;
    this.textRect[7] = dy;
  }

  normalDistance(aim) {

    const [ax, ay, bx, by, cx, cy, dx, dy] = this.textRect;

    const d1 = pointToLineSignedDistance(ax, ay, bx, by, aim.x, aim.y);
    if (d1 >= 0) {
      const d2 = pointToLineSignedDistance(bx, by, cx, cy, aim.x, aim.y);
      if (d2 >= 0) {
        const d3 = pointToLineSignedDistance(cx, cy, dx, dy, aim.x, aim.y);
        if (d3 >= 0) {
          const d4 = pointToLineSignedDistance(dx, dy, ax, ay, aim.x, aim.y);
          if (d4 >= 0) {
            return 0;
          }
        }
      }
    }

    return -1;

  }
}
