/**
 * Material factories for surfacing Three.js primitives.
 *
 * Each factory returns a fresh material so callers can tweak per-instance
 * properties (color, opacity) without interfering with siblings. Where a
 * single material is safe to share (cage grid lines), a singleton is exported.
 */
import {
  MeshPhongMaterial, MeshBasicMaterial, LineBasicMaterial, DoubleSide,
} from 'three';
import {
  SURFACE_BASE_COLOR,
  WIREFRAME_COLOR,
  CAGE_LINE_COLOR,
  CP_COLOR,
  CURVE_COLOR,
} from './colors';

// ---------------------------------------------------------------------------
// Surface (shaded mesh)
// ---------------------------------------------------------------------------

export function createSurfaceMaterial(color: number = SURFACE_BASE_COLOR): MeshPhongMaterial {
  return new MeshPhongMaterial({
    side: DoubleSide,
    color,
    shininess: 80,
    specular: 0x444444,
  });
}

// ---------------------------------------------------------------------------
// Wireframe overlay
// ---------------------------------------------------------------------------

export function createWireframeMaterial(color: number = WIREFRAME_COLOR): LineBasicMaterial {
  return new LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
  });
}

// ---------------------------------------------------------------------------
// Hover highlight (additive wash over a surface)
// ---------------------------------------------------------------------------

export function createHoverHighlightMaterial(color: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.25,
    side: DoubleSide,
    depthTest: true,
  });
}

// ---------------------------------------------------------------------------
// Cage grid lines (3×3 control-point grid)
// ---------------------------------------------------------------------------

export function createCageLineMaterial(color: number = CAGE_LINE_COLOR): LineBasicMaterial {
  const mat = new LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });
  mat.depthWrite = false;
  return mat;
}

// ---------------------------------------------------------------------------
// Control-point handle spheres
// ---------------------------------------------------------------------------

export function createControlPointMaterial(color: number = CP_COLOR): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
}

/** Invisible-but-raycastable material used for the picker hitbox sphere. */
export function createPickerMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
}

// ---------------------------------------------------------------------------
// Plain curve (NurbsCurve rendering)
// ---------------------------------------------------------------------------

export function createCurveMaterial(color: number = CURVE_COLOR): LineBasicMaterial {
  return new LineBasicMaterial({color});
}
