export const WHITE = 0xffffff;
export const GREEN = 0x00ff00;
export const BLUE = 0x0000CD;
export const SALMON = 0xFA8072;
export const YELLOW = 0xffff00;
export const PINK = 0xff00ff;
export const ORANGE = 0xFFA500;
export const RED = 0xff0000;
export const AQUA = 0x00FFFF;

export const BLACK = 0x000000;
export const TEAL = 0x008080; // go sharks
export const GREEN_YELLOW = 0xADFF2F; // go sharks

export const COLOR_CYCLE = [WHITE, GREEN, BLUE, SALMON, YELLOW, PINK, ORANGE, RED, AQUA];
  
export const DETECTED_EDGE = PINK;
export const DISCARDED_EDGE = BLACK;

export function cycleColor(color) {
  return COLOR_CYCLE[(COLOR_CYCLE.indexOf(color) + 1 ) % COLOR_CYCLE.length];
}