import {PatchCage, NurbsPatch, CageVertex} from '../PatchCage';
import {makeGrid} from '../patchCageHelpers';
import {V, Vlerp} from './helpers';

export function createPatchBox(sizeX: number, sizeY: number, sizeZ: number): PatchCage {
  const cage = new PatchCage();
  const hx = sizeX / 2, hy = sizeY / 2, hz = sizeZ / 2;

  // 8 shared corner vertices
  const v000 = V(-hx,-hy,-hz), v100 = V(hx,-hy,-hz);
  const v010 = V(-hx,hy,-hz),  v110 = V(hx,hy,-hz);
  const v001 = V(-hx,-hy,hz),  v101 = V(hx,-hy,hz);
  const v011 = V(-hx,hy,hz),   v111 = V(hx,hy,hz);

  // 12 shared edge interior vertices (2 per edge)
  // Bottom face edges
  const e01_1 = Vlerp(v000,v100,1/3), e01_2 = Vlerp(v000,v100,2/3); // bottom-front
  const e12_1 = Vlerp(v100,v110,1/3), e12_2 = Vlerp(v100,v110,2/3); // bottom-right
  const e23_1 = Vlerp(v010,v110,1/3), e23_2 = Vlerp(v010,v110,2/3); // bottom-back
  const e30_1 = Vlerp(v000,v010,1/3), e30_2 = Vlerp(v000,v010,2/3); // bottom-left

  // Top face edges
  const e45_1 = Vlerp(v001,v101,1/3), e45_2 = Vlerp(v001,v101,2/3);
  const e56_1 = Vlerp(v101,v111,1/3), e56_2 = Vlerp(v101,v111,2/3);
  const e67_1 = Vlerp(v011,v111,1/3), e67_2 = Vlerp(v011,v111,2/3);
  const e74_1 = Vlerp(v001,v011,1/3), e74_2 = Vlerp(v001,v011,2/3);

  // Vertical edges
  const e04_1 = Vlerp(v000,v001,1/3), e04_2 = Vlerp(v000,v001,2/3);
  const e15_1 = Vlerp(v100,v101,1/3), e15_2 = Vlerp(v100,v101,2/3);
  const e26_1 = Vlerp(v110,v111,1/3), e26_2 = Vlerp(v110,v111,2/3);
  const e37_1 = Vlerp(v010,v011,1/3), e37_2 = Vlerp(v010,v011,2/3);

  // 6 faces, each sharing corner + edge vertices with neighbors
  // Bottom (-Z): corners v000,v100,v010,v110
  cage.patches.push(new NurbsPatch(makeGrid([v000,v100,v010,v110], {
    bottom: [v000, e01_1, e01_2, v100],
    right: [v100, e12_1, e12_2, v110],
    top: [v010, e23_1, e23_2, v110],
    left: [v000, e30_1, e30_2, v010],
  })));

  // Top (+Z): corners v001,v101,v011,v111
  cage.patches.push(new NurbsPatch(makeGrid([v001,v101,v011,v111], {
    bottom: [v001, e45_1, e45_2, v101],
    right: [v101, e56_1, e56_2, v111],
    top: [v011, e67_1, e67_2, v111],
    left: [v001, e74_1, e74_2, v011],
  })));

  // Front (-Y): corners v000,v100,v001,v101
  cage.patches.push(new NurbsPatch(makeGrid([v000,v100,v001,v101], {
    bottom: [v000, e01_1, e01_2, v100],
    right: [v100, e15_1, e15_2, v101],
    top: [v001, e45_1, e45_2, v101],
    left: [v000, e04_1, e04_2, v001],
  })));

  // Back (+Y): corners v110,v010,v111,v011
  cage.patches.push(new NurbsPatch(makeGrid([v110,v010,v111,v011], {
    bottom: [v110, e23_2, e23_1, v010], // reversed
    right: [v010, e37_1, e37_2, v011],
    top: [v111, e67_2, e67_1, v011], // reversed
    left: [v110, e26_1, e26_2, v111],
  })));

  // Right (+X): corners v100,v110,v101,v111
  cage.patches.push(new NurbsPatch(makeGrid([v100,v110,v101,v111], {
    bottom: [v100, e12_1, e12_2, v110],
    right: [v110, e26_1, e26_2, v111],
    top: [v101, e56_1, e56_2, v111],
    left: [v100, e15_1, e15_2, v101],
  })));

  // Left (-X): corners v010,v000,v011,v001
  cage.patches.push(new NurbsPatch(makeGrid([v010,v000,v011,v001], {
    bottom: [v010, e30_2, e30_1, v000], // reversed
    right: [v000, e04_1, e04_2, v001],
    top: [v011, e74_2, e74_1, v001], // reversed
    left: [v010, e37_1, e37_2, v011],
  })));

  return cage;
}
