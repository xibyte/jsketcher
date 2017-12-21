export const WHITE = 0xffffff;
export const GREEN = 0x00ff00;
export const BLUE = 0x0000CD;
export const SALMON = 0xFA8072;
export const YELLOW = 0xffff00;
export const PINK = 0xff00ff;
export const ORANGE = 0xFFA500;
export const RED = 0xff0000;

export const COLOR_CYCLE = [WHITE, GREEN, BLUE, SALMON, YELLOW, PINK, ORANGE, RED];
  
export function cycleColor(color) {
  return COLOR_CYCLE[(COLOR_CYCLE.indexOf(color) + 1 ) % COLOR_CYCLE.length];
}