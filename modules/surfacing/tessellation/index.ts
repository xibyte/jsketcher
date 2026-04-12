export {
  CurveTessPoint,
  BorderTessPoint,
  TessPoint,
  TessEdge,
  Tile,
  type AnyTessPoint,
  type Vec2,
} from './types';
export {allocateCurveSamples} from './tessellateCurve';
export {
  tessellateSurface,
  refreshSurfaceTessellation,
  type SurfaceTessellation,
} from './tessellateSurface';
