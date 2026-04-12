import {Scene, NurbsSurface} from '../models/Scene/Scene.entity';
import {makeGrid} from '../patchCageHelpers';
import {SurfaceSet} from '../SurfaceSet';
import {V, Vlerp} from './helpers';
import {LocalBoundingCurveCache} from '../models/BoundingCurve/buildBoundingCurves';
import type {SurfacingEditor} from '../SurfacingEditor';

export function createPatchBox(ctx: SurfacingEditor, sizeX: number, sizeY: number, sizeZ: number): Scene {
  const scene = new Scene(ctx);
  const curveCache = new LocalBoundingCurveCache();
  const makePatch = (grid: ReturnType<typeof makeGrid>) =>
    new NurbsSurface(ctx, grid, curveCache.curvesFor(ctx, grid));
  const hx = sizeX / 2, hy = sizeY / 2, hz = sizeZ / 2;

  // 8 shared corner vertices
  const v000 = V(ctx, -hx,-hy,-hz), v100 = V(ctx, hx,-hy,-hz);
  const v010 = V(ctx, -hx,hy,-hz),  v110 = V(ctx, hx,hy,-hz);
  const v001 = V(ctx, -hx,-hy,hz),  v101 = V(ctx, hx,-hy,hz);
  const v011 = V(ctx, -hx,hy,hz),   v111 = V(ctx, hx,hy,hz);

  // 12 shared edge interior vertices (2 per edge)
  // Bottom face edges
  const e01_1 = Vlerp(ctx, v000,v100,1/3), e01_2 = Vlerp(ctx, v000,v100,2/3); // bottom-front
  const e12_1 = Vlerp(ctx, v100,v110,1/3), e12_2 = Vlerp(ctx, v100,v110,2/3); // bottom-right
  const e23_1 = Vlerp(ctx, v010,v110,1/3), e23_2 = Vlerp(ctx, v010,v110,2/3); // bottom-back
  const e30_1 = Vlerp(ctx, v000,v010,1/3), e30_2 = Vlerp(ctx, v000,v010,2/3); // bottom-left

  // Top face edges
  const e45_1 = Vlerp(ctx, v001,v101,1/3), e45_2 = Vlerp(ctx, v001,v101,2/3);
  const e56_1 = Vlerp(ctx, v101,v111,1/3), e56_2 = Vlerp(ctx, v101,v111,2/3);
  const e67_1 = Vlerp(ctx, v011,v111,1/3), e67_2 = Vlerp(ctx, v011,v111,2/3);
  const e74_1 = Vlerp(ctx, v001,v011,1/3), e74_2 = Vlerp(ctx, v001,v011,2/3);

  // Vertical edges
  const e04_1 = Vlerp(ctx, v000,v001,1/3), e04_2 = Vlerp(ctx, v000,v001,2/3);
  const e15_1 = Vlerp(ctx, v100,v101,1/3), e15_2 = Vlerp(ctx, v100,v101,2/3);
  const e26_1 = Vlerp(ctx, v110,v111,1/3), e26_2 = Vlerp(ctx, v110,v111,2/3);
  const e37_1 = Vlerp(ctx, v010,v011,1/3), e37_2 = Vlerp(ctx, v010,v011,2/3);

  // 6 faces, each sharing corner + edge vertices with neighbors
  const surfaces: NurbsSurface[] = [
    // Bottom (-Z)
    makePatch(makeGrid(ctx, [v000,v100,v010,v110], {
      bottom: [v000, e01_1, e01_2, v100],
      right: [v100, e12_1, e12_2, v110],
      top: [v010, e23_1, e23_2, v110],
      left: [v000, e30_1, e30_2, v010],
    })),
    // Top (+Z)
    makePatch(makeGrid(ctx, [v001,v101,v011,v111], {
      bottom: [v001, e45_1, e45_2, v101],
      right: [v101, e56_1, e56_2, v111],
      top: [v011, e67_1, e67_2, v111],
      left: [v001, e74_1, e74_2, v011],
    })),
    // Front (-Y)
    makePatch(makeGrid(ctx, [v000,v100,v001,v101], {
      bottom: [v000, e01_1, e01_2, v100],
      right: [v100, e15_1, e15_2, v101],
      top: [v001, e45_1, e45_2, v101],
      left: [v000, e04_1, e04_2, v001],
    })),
    // Back (+Y)
    makePatch(makeGrid(ctx, [v110,v010,v111,v011], {
      bottom: [v110, e23_2, e23_1, v010], // reversed
      right: [v010, e37_1, e37_2, v011],
      top: [v111, e67_2, e67_1, v011], // reversed
      left: [v110, e26_1, e26_2, v111],
    })),
    // Right (+X)
    makePatch(makeGrid(ctx, [v100,v110,v101,v111], {
      bottom: [v100, e12_1, e12_2, v110],
      right: [v110, e26_1, e26_2, v111],
      top: [v101, e56_1, e56_2, v111],
      left: [v100, e15_1, e15_2, v101],
    })),
    // Left (-X)
    makePatch(makeGrid(ctx, [v010,v000,v011,v001], {
      bottom: [v010, e30_2, e30_1, v000], // reversed
      right: [v000, e04_1, e04_2, v001],
      top: [v011, e74_2, e74_1, v001], // reversed
      left: [v010, e37_1, e37_2, v011],
    })),
  ];

  scene.createGroup('Box', surfaces);

  // Each face of the box is its own SurfaceSet (single-patch sets)
  const faceNames = ['bottom', 'top', 'front', 'back', 'right', 'left'];
  for (let i = 0; i < 6; i++) {
    const set = new SurfaceSet(faceNames[i]);
    set.add(surfaces[i]);
  }

  return scene;
}
