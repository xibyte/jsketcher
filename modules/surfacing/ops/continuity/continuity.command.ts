import {PatchCage} from '../../PatchCage';

/**
 * Apply G1 (tangent plane) continuity to patchIdx at the given side.
 * Modifies the first interior row of patchIdx so its cross-boundary
 * tangent mirrors the adjacent patch's tangent across the shared edge.
 */
export function applyG1(cage: PatchCage, patchIdx: number, side: number): boolean {
  const adj = cage.findAdjacentPatches(patchIdx);
  const match = adj.find(a => a.side === side);
  if (!match) return false;

  const boundary = cage.patches[patchIdx].getEdgeVertices(side);
  const myInterior = cage.getInteriorRow(patchIdx, side, 1);
  const refInterior = cage.getInteriorRow(match.otherIdx, match.otherSide, 1);
  const opposite = cage.getInteriorRow(patchIdx, side, 3);

  for (let i = 0; i < 4; i++) {
    const ri = match.reversed ? 3 - i : i;
    const e = boundary[i].position;
    const b = refInterior[ri].position;
    // Use 1/3 of depth (distance to opposite edge) as target distance
    const opp = opposite[i].position;
    const depth = Math.sqrt((opp[0]-e[0])**2 + (opp[1]-e[1])**2 + (opp[2]-e[2])**2);
    const targetDist = depth / 3;
    // Reflected tangent direction: away from adjacent interior point
    const dx = e[0] - b[0];
    const dy = e[1] - b[1];
    const dz = e[2] - b[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-10) continue;
    const scale = targetDist / len;
    myInterior[i].set(e[0] + dx * scale, e[1] + dy * scale, e[2] + dz * scale);
  }
  return true;
}

/**
 * Apply G1 continuity to every side of patchIdx that has an adjacent patch.
 */
export function applyG1AllSides(cage: PatchCage, patchIdx: number): void {
  const adj = cage.findAdjacentPatches(patchIdx);
  for (const a of adj) {
    applyG1(cage, patchIdx, a.side);
  }
}

/**
 * Apply G2 (curvature) continuity to patchIdx at the given side.
 * Modifies first AND second interior rows.
 * G2 requires matching both tangent (G1) and second derivative.
 */
export function applyG2(cage: PatchCage, patchIdx: number, side: number): boolean {
  // First apply G1
  if (!applyG1(cage, patchIdx, side)) return false;

  const adj = cage.findAdjacentPatches(patchIdx);
  const match = adj.find(a => a.side === side)!;

  const boundary = cage.patches[patchIdx].getEdgeVertices(side);
  const myRow1 = cage.getInteriorRow(patchIdx, side, 1);
  const myRow2 = cage.getInteriorRow(patchIdx, side, 2);
  const refRow1 = cage.getInteriorRow(match.otherIdx, match.otherSide, 1);
  const refRow2 = cage.getInteriorRow(match.otherIdx, match.otherSide, 2);

  for (let i = 0; i < 4; i++) {
    const ri = match.reversed ? 3 - i : i;
    const e = boundary[i].position;
    const a1 = myRow1[i].position;
    const b1 = refRow1[ri].position;
    const b2 = refRow2[ri].position;
    // G2: second derivative matching
    // d2A = d2B across boundary → A2 = 2*A1 - E + (B2 - 2*B1 + E)
    // = 2*A1 - E + B2 - 2*B1 + E = 2*A1 + B2 - 2*B1
    myRow2[i].set(
      2 * a1[0] + b2[0] - 2 * b1[0],
      2 * a1[1] + b2[1] - 2 * b1[1],
      2 * a1[2] + b2[2] - 2 * b1[2]
    );
  }
  return true;
}
