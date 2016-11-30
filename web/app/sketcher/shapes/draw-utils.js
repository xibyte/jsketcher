
export function DrawPoint(ctx, x, y, rad, scale) {
  ctx.beginPath();
  ctx.arc(x, y, rad / scale, 0, 2 * Math.PI, false);
  ctx.fill();
}

export function SetStyle(style, ctx, scale) {
  ctx.lineWidth  = style.lineWidth / scale;
  ctx.strokeStyle  = style.strokeStyle;
  ctx.fillStyle  = style.fillStyle;
}
