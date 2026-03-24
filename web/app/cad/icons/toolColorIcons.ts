// Colored SVG icon strings for toolbar operations.
// Each value is an inline SVG string (no width/height — set at render time via replace).
// Colors are chosen to be readable on both dark and light backgrounds.

export const TOOL_COLOR_ICONS: Record<string, string> = {

  // ── Primitives (amber/orange) ────────────────────────────────────────
  BOX: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <polygon points="12,2 21,6.5 12,11 3,6.5" fill="#ffb74d" opacity="0.95"/>
    <polygon points="3,6.5 12,11 12,20 3,15.5" fill="#ff8a65" opacity="0.95"/>
    <polygon points="21,6.5 12,11 12,20 21,15.5" fill="#ffa040" opacity="0.95"/>
  </svg>`,

  CYLINDER: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="4" y="8" width="16" height="10" fill="#ffb74d" opacity="0.7"/>
    <ellipse cx="12" cy="18" rx="8" ry="2.5" fill="#ff8a65"/>
    <ellipse cx="12" cy="8" rx="8" ry="2.5" fill="#ffcc80"/>
    <rect x="4" y="8" width="16" height="10" fill="none" stroke="#ff8a65" stroke-width="1"/>
  </svg>`,

  SPHERE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="#ffb74d" opacity="0.8"/>
    <ellipse cx="12" cy="12" rx="9" ry="3.5" fill="none" stroke="#ff6f00" stroke-width="1.2" opacity="0.7"/>
    <ellipse cx="12" cy="12" rx="3.5" ry="9" fill="none" stroke="#ff6f00" stroke-width="1.2" opacity="0.7"/>
    <circle cx="12" cy="12" r="9" fill="none" stroke="#ff8a65" stroke-width="1"/>
  </svg>`,

  CONE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <polygon points="12,2 20,19 4,19" fill="#ffb74d" opacity="0.85"/>
    <ellipse cx="12" cy="19" rx="8" ry="2.2" fill="#ff8a65"/>
    <line x1="4" y1="19" x2="12" y2="2" stroke="#ff6f00" stroke-width="1" opacity="0.6"/>
    <line x1="20" y1="19" x2="12" y2="2" stroke="#ff6f00" stroke-width="1" opacity="0.6"/>
  </svg>`,

  TORUS: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <ellipse cx="12" cy="13" rx="9" ry="5.5" fill="none" stroke="#ffb74d" stroke-width="5"/>
    <ellipse cx="12" cy="13" rx="9" ry="5.5" fill="none" stroke="#ff8a65" stroke-width="1.5"/>
    <ellipse cx="12" cy="13" rx="4" ry="2.5" fill="none" stroke="#ff6f00" stroke-width="1" opacity="0.7"/>
  </svg>`,

  // ── Sketch / Profile ops (cyan/teal) ─────────────────────────────────
  EXTRUDE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="3" y="14" width="14" height="7" rx="1" fill="none" stroke="#4dd0e1" stroke-width="1.2" stroke-dasharray="2.5,2"/>
    <rect x="3" y="5" width="14" height="9" rx="1" fill="#4dd0e1" opacity="0.3" stroke="#4dd0e1" stroke-width="1.5"/>
    <line x1="20" y1="17" x2="20" y2="5" stroke="#4dd0e1" stroke-width="2"/>
    <polyline points="17,8 20,5 23,8" fill="none" stroke="#4dd0e1" stroke-width="1.5"/>
  </svg>`,

  CUT: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="10" width="15" height="11" rx="1" fill="#4dd0e1" opacity="0.35" stroke="#4dd0e1" stroke-width="1.5"/>
    <rect x="5" y="3" width="7" height="11" rx="1" fill="#ef5350" opacity="0.55" stroke="#ef5350" stroke-width="1.5"/>
    <line x1="20" y1="4" x2="20" y2="16" stroke="#ef5350" stroke-width="2"/>
    <polyline points="17,13 20,16 23,13" fill="none" stroke="#ef5350" stroke-width="1.5"/>
  </svg>`,

  REVOLVE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <line x1="5" y1="2" x2="5" y2="22" stroke="#4dd0e1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <path d="M5,4 Q19,7 19,12 Q19,17 5,20" fill="#4dd0e1" opacity="0.3" stroke="#4dd0e1" stroke-width="1.5"/>
    <path d="M11,4 A8,8 0 0 1 11,20" fill="none" stroke="#4dd0e1" stroke-width="1" stroke-dasharray="2,2" opacity="0.7"/>
  </svg>`,

  LOFT: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="4" r="3" fill="none" stroke="#4dd0e1" stroke-width="1.5"/>
    <rect x="3" y="17" width="18" height="4" rx="1" fill="none" stroke="#4dd0e1" stroke-width="1.5"/>
    <path d="M9,4 Q3,10 3,17 L21,17 Q21,10 15,4 A3,3 0 0 0 9,4Z" fill="#4dd0e1" opacity="0.2"/>
    <line x1="9" y1="4" x2="3" y2="17" stroke="#4dd0e1" stroke-width="1" opacity="0.6"/>
    <line x1="15" y1="4" x2="21" y2="17" stroke="#4dd0e1" stroke-width="1" opacity="0.6"/>
  </svg>`,

  SWEEP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M3,20 Q8,3 21,4" fill="none" stroke="#4dd0e1" stroke-width="2" stroke-dasharray="3,2"/>
    <ellipse cx="4" cy="19" rx="3.5" ry="2.5" transform="rotate(-35,4,19)" fill="#4dd0e1" opacity="0.5" stroke="#4dd0e1" stroke-width="1"/>
    <ellipse cx="12" cy="10.5" rx="3" ry="2" transform="rotate(-15,12,10.5)" fill="#4dd0e1" opacity="0.35" stroke="#4dd0e1" stroke-width="1"/>
    <ellipse cx="20" cy="5.5" rx="2.5" ry="1.5" transform="rotate(-5,20,5.5)" fill="#4dd0e1" opacity="0.2" stroke="#4dd0e1" stroke-width="1"/>
  </svg>`,

  // ── Boolean ops (purple) ─────────────────────────────────────────────
  UNION: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="9" cy="12" r="6.5" fill="#ba68c8" opacity="0.55" stroke="#ba68c8" stroke-width="1.5"/>
    <circle cx="15" cy="12" r="6.5" fill="#ba68c8" opacity="0.55" stroke="#ba68c8" stroke-width="1.5"/>
  </svg>`,

  SUBTRACT: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="9" cy="12" r="6.5" fill="#ba68c8" opacity="0.6" stroke="#ba68c8" stroke-width="1.5"/>
    <circle cx="15" cy="12" r="6.5" fill="#1a1a25" opacity="0.8" stroke="#ef5350" stroke-width="1.5" stroke-dasharray="3,2"/>
    <line x1="12" y1="9.5" x2="19" y2="9.5" stroke="#ef5350" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  INTERSECT: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="9" cy="12" r="6.5" fill="none" stroke="#ba68c8" stroke-width="1.5" opacity="0.6"/>
    <circle cx="15" cy="12" r="6.5" fill="none" stroke="#ba68c8" stroke-width="1.5" opacity="0.6"/>
    <path d="M12,5.68 A6.5,6.5 0 0 1 12,18.32 A6.5,6.5 0 0 1 12,5.68Z" fill="#ba68c8" opacity="0.85"/>
  </svg>`,

  // ── Finishing ops (green) ────────────────────────────────────────────
  SHELL_TOOL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="1.5" fill="none" stroke="#81c784" stroke-width="2"/>
    <rect x="7" y="7" width="10" height="10" rx="1" fill="none" stroke="#81c784" stroke-width="1.5" stroke-dasharray="2.5,2"/>
  </svg>`,

  FILLET_TOOL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M4,21 L4,4 L21,4" fill="none" stroke="#81c784" stroke-width="1.5" opacity="0.4" stroke-dasharray="3,2"/>
    <path d="M4,21 L4,9 Q4,4 9,4 L21,4" fill="none" stroke="#81c784" stroke-width="2.5"/>
    <circle cx="9" cy="9" r="1.5" fill="#81c784" opacity="0.7"/>
  </svg>`,

  CHAMFER_TOOL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M4,21 L4,4 L21,4" fill="none" stroke="#81c784" stroke-width="1.5" opacity="0.4" stroke-dasharray="3,2"/>
    <path d="M4,21 L4,10 L10,4 L21,4" fill="none" stroke="#81c784" stroke-width="2.5"/>
    <line x1="4" y1="10" x2="10" y2="4" stroke="#a5d6a7" stroke-width="1" opacity="0.7"/>
  </svg>`,

  SCALE_BODY: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="8" y="8" width="8" height="8" rx="1" fill="#64b5f6" opacity="0.45" stroke="#64b5f6" stroke-width="1.5"/>
    <polyline points="3,7 3,3 7,3" fill="none" stroke="#64b5f6" stroke-width="1.8"/>
    <line x1="3" y1="3" x2="8" y2="8" stroke="#64b5f6" stroke-width="1.3"/>
    <polyline points="21,7 21,3 17,3" fill="none" stroke="#64b5f6" stroke-width="1.8"/>
    <line x1="21" y1="3" x2="16" y2="8" stroke="#64b5f6" stroke-width="1.3"/>
    <polyline points="3,17 3,21 7,21" fill="none" stroke="#64b5f6" stroke-width="1.8"/>
    <line x1="3" y1="21" x2="8" y2="16" stroke="#64b5f6" stroke-width="1.3"/>
    <polyline points="21,17 21,21 17,21" fill="none" stroke="#64b5f6" stroke-width="1.8"/>
    <line x1="21" y1="21" x2="16" y2="16" stroke="#64b5f6" stroke-width="1.3"/>
  </svg>`,

  // ── Body transform ops (blue) ────────────────────────────────────────
  MIRROR_BODY: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <line x1="12" y1="2" x2="12" y2="22" stroke="#64b5f6" stroke-width="1.5" stroke-dasharray="3,2"/>
    <polygon points="3,7 10,4 10,20 3,17" fill="#64b5f6" opacity="0.75"/>
    <polygon points="21,7 14,4 14,20 21,17" fill="#64b5f6" opacity="0.35"/>
  </svg>`,

  PATTERN_LINEAR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="8" width="5" height="7" rx="1" fill="#fff176" opacity="0.95"/>
    <rect x="9.5" y="8" width="5" height="7" rx="1" fill="#fff176" opacity="0.65"/>
    <rect x="17" y="8" width="5" height="7" rx="1" fill="#fff176" opacity="0.35"/>
    <line x1="2" y1="20" x2="19" y2="20" stroke="#fff176" stroke-width="1.5"/>
    <polyline points="16,17.5 19,20 16,22.5" fill="none" stroke="#fff176" stroke-width="1.5"/>
  </svg>`,

  PATTERN_RADIAL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="1.8" fill="#fff176"/>
    <circle cx="12" cy="12" r="7" fill="none" stroke="#fff176" stroke-width="1" stroke-dasharray="2,2" opacity="0.55"/>
    <rect x="10" y="3" width="4" height="3.5" rx="1" fill="#fff176" opacity="0.95"/>
    <rect x="16.5" y="9.5" width="3.5" height="3.5" rx="1" fill="#fff176" opacity="0.75"/>
    <rect x="10" y="17.5" width="4" height="3.5" rx="1" fill="#fff176" opacity="0.55"/>
    <rect x="4" y="9.5" width="3.5" height="3.5" rx="1" fill="#fff176" opacity="0.75"/>
  </svg>`,

  MOVE_BODY_SIMPLE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="9" y="9" width="6" height="6" rx="1" fill="#64b5f6" opacity="0.45"/>
    <line x1="12" y1="2" x2="12" y2="9" stroke="#64b5f6" stroke-width="2"/>
    <polyline points="9.5,5 12,2 14.5,5" fill="none" stroke="#64b5f6" stroke-width="1.5"/>
    <line x1="12" y1="15" x2="12" y2="22" stroke="#64b5f6" stroke-width="2"/>
    <polyline points="9.5,19 12,22 14.5,19" fill="none" stroke="#64b5f6" stroke-width="1.5"/>
    <line x1="2" y1="12" x2="9" y2="12" stroke="#64b5f6" stroke-width="2"/>
    <polyline points="5,9.5 2,12 5,14.5" fill="none" stroke="#64b5f6" stroke-width="1.5"/>
    <line x1="15" y1="12" x2="22" y2="12" stroke="#64b5f6" stroke-width="2"/>
    <polyline points="19,9.5 22,12 19,14.5" fill="none" stroke="#64b5f6" stroke-width="1.5"/>
  </svg>`,

  ROTATE_BODY_SIMPLE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M6.5,11.5 A6,6 0 1 1 12.5,18" fill="none" stroke="#64b5f6" stroke-width="2.5" stroke-linecap="round"/>
    <polyline points="9.5,16 12.5,18 10.5,21" fill="none" stroke="#64b5f6" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="2" fill="#64b5f6"/>
  </svg>`,

  SPLIT_BODY: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="5" width="8.5" height="14" rx="1.5" fill="#64b5f6" opacity="0.65" stroke="#64b5f6" stroke-width="1.5"/>
    <rect x="13.5" y="5" width="8.5" height="14" rx="1.5" fill="#64b5f6" opacity="0.35" stroke="#64b5f6" stroke-width="1.5"/>
    <line x1="12" y1="2" x2="12" y2="22" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.8"/>
  </svg>`,

  // ── Special tools (gold/yellow) ───────────────────────────────────────
  PLANE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <polygon points="2,16 12,10 22,16 12,22" fill="#ffd54f" opacity="0.35" stroke="#ffd54f" stroke-width="1.5"/>
    <line x1="12" y1="10" x2="12" y2="3" stroke="#ffd54f" stroke-width="1.5" stroke-dasharray="2.5,2"/>
    <polyline points="10,5.5 12,3 14,5.5" fill="none" stroke="#ffd54f" stroke-width="1.5"/>
  </svg>`,

  EditFace: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <polygon points="2,17 10,11 22,15 14,21" fill="#ffd54f" opacity="0.35" stroke="#ffd54f" stroke-width="1.5"/>
    <rect x="12" y="2" width="3.5" height="11" rx="1" transform="rotate(45,13.75,7.5)" fill="#ffd54f" opacity="0.9"/>
    <polygon points="16.5,13.5 14.5,15.5 18.5,15.5" fill="#ffd54f"/>
  </svg>`,

  HOLE_TOOL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="10" width="20" height="8" rx="1" fill="#ffd54f" opacity="0.4" stroke="#ffd54f" stroke-width="1.5"/>
    <ellipse cx="12" cy="10" rx="4.5" ry="1.8" fill="#ffd54f" opacity="0.9"/>
    <line x1="7.5" y1="10" x2="7.5" y2="18" stroke="#ffd54f" stroke-width="1.5"/>
    <line x1="16.5" y1="10" x2="16.5" y2="18" stroke="#ffd54f" stroke-width="1.5"/>
    <ellipse cx="12" cy="18" rx="4.5" ry="1.8" fill="none" stroke="#ffd54f" stroke-width="1.5" opacity="0.55"/>
  </svg>`,

  // ── Utility (cool gray/white) ─────────────────────────────────────────
  MEASURE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="8" width="20" height="7" rx="1.5" fill="#b0bec5" opacity="0.6" stroke="#b0bec5" stroke-width="1"/>
    <line x1="5.5" y1="8" x2="5.5" y2="12" stroke="#ffffff" stroke-width="1.2"/>
    <line x1="9" y1="8" x2="9" y2="11" stroke="#ffffff" stroke-width="1.2"/>
    <line x1="12.5" y1="8" x2="12.5" y2="12" stroke="#ffffff" stroke-width="1.2"/>
    <line x1="16" y1="8" x2="16" y2="11" stroke="#ffffff" stroke-width="1.2"/>
    <line x1="19.5" y1="8" x2="19.5" y2="12" stroke="#ffffff" stroke-width="1.2"/>
    <line x1="2" y1="4" x2="22" y2="4" stroke="#b0bec5" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.7"/>
    <line x1="2" y1="20" x2="22" y2="20" stroke="#b0bec5" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.7"/>
    <line x1="2" y1="4" x2="2" y2="20" stroke="#b0bec5" stroke-width="1.5" opacity="0.7"/>
    <line x1="22" y1="4" x2="22" y2="20" stroke="#b0bec5" stroke-width="1.5" opacity="0.7"/>
  </svg>`,

  DeselectAll: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="3" y="3" width="12" height="12" rx="1.5" fill="#b0bec5" opacity="0.35" stroke="#b0bec5" stroke-width="1.5" stroke-dasharray="3,2"/>
    <line x1="14" y1="14" x2="21" y2="21" stroke="#ef5350" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="21" y1="14" x2="14" y2="21" stroke="#ef5350" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  'menu.file': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M3,9 L3,18 Q3,19 4,19 L20,19 Q21,19 21,18 L21,9Z" fill="#FFC107"/>
    <path d="M3,9 L3,7 Q3,6 4,6 L9.5,6 L11.5,8.5 L11.5,9Z" fill="#FFB300"/>
    <rect x="3" y="9" width="18" height="2" fill="#FFD54F" opacity="0.5"/>
  </svg>`,

  ToggleSettings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#9E9E9E" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94zM12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </svg>`,

};
