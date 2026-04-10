/**
 * Adapter: creates a Scene entity graph from an existing PatchCage instance.
 * This bridges the old PatchCage data model with the new entity system.
 */
import {Scene} from './Scene.entity';
import {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {Group} from '../Group/Group.entity';

export function sceneFromPatchCage(cage: any): Scene {
  const scene = new Scene();

  // Map old CageVertex → new Vertex (preserve identity sharing)
  const vertexMap = new Map<any, Vertex>();

  function getVertex(cv: any): Vertex {
    let v = vertexMap.get(cv);
    if (!v) {
      v = new Vertex(cv.position[0], cv.position[1], cv.position[2]);
      vertexMap.set(cv, v);
    }
    return v;
  }

  // Map old CageVertex → ControlPoint (one CP per unique grid cell position)
  const cpMap = new Map<any, Map<number, ControlPoint>>();

  function getControlPoint(cv: any, weight: number): ControlPoint {
    const vertex = getVertex(cv);
    if (!cpMap.has(cv)) cpMap.set(cv, new Map());
    const weightMap = cpMap.get(cv)!;
    const wKey = Math.round(weight * 1e6);
    let cp = weightMap.get(wKey);
    if (!cp) {
      cp = new ControlPoint(vertex, weight);
      weightMap.set(wKey, cp);
    }
    return cp;
  }

  // Build all surfaces
  const allSurfaces: NurbsSurface[] = [];
  for (let pi = 0; pi < cage.patches.length; pi++) {
    const patch = cage.patches[pi];
    const cpGrid: ControlPoint[][] = [];

    for (let row = 0; row < 4; row++) {
      cpGrid[row] = [];
      for (let col = 0; col < 4; col++) {
        const cv = patch.grid[row][col];
        const weight = patch.weights[row][col];
        cpGrid[row][col] = getControlPoint(cv, weight);
      }
    }

    const surface = new NurbsSurface(cpGrid);
    surface.rational = patch.rational;

    // Restore arc constraints
    for (const ac of cage.arcConstraints) {
      if (ac.patchSide && ac.patchSide.patchIdx === pi) {
        surface.getBoundingCurve(ac.patchSide.side).arcConstraint = {
          radius: ac.radius,
          angle: ac.angle,
          planeNormal: [...ac.planeNormal] as [number, number, number],
          center: [...ac.center] as [number, number, number],
          mode: ac.mode,
        };
      }
    }

    allSurfaces.push(surface);
    scene.addSurface(surface);
  }

  // Organize surfaces into groups
  if (cage.groups && cage.groups.length > 0) {
    for (const g of cage.groups) {
      const group = new Group(g.name);
      scene.addChild(group);
      for (const idx of g.patchIndices) {
        if (idx < allSurfaces.length) {
          group.addChild(allSurfaces[idx]);
        }
      }
    }
    // Surfaces not in any group go into an "Ungrouped" group
    const grouped = new Set<NurbsSurface>();
    for (const g of cage.groups) {
      for (const idx of g.patchIndices) {
        if (idx < allSurfaces.length) grouped.add(allSurfaces[idx]);
      }
    }
    const ungrouped = allSurfaces.filter(s => !grouped.has(s));
    if (ungrouped.length > 0) {
      const ug = new Group('Ungrouped');
      scene.addChild(ug);
      for (const s of ungrouped) ug.addChild(s);
    }
  } else {
    // No groups defined — put everything in one default group
    const defaultGroup = new Group('Default');
    scene.addChild(defaultGroup);
    for (const s of allSurfaces) defaultGroup.addChild(s);
  }

  // Restore mirror constraints
  for (const mc of cage.mirrorConstraints) {
    const target = allSurfaces[mc.mirrorPatchIdx];
    const source = allSurfaces[mc.sourcePatchIdx];
    if (target && source) {
      target.mirrorOf = {
        source,
        planePoint: [...mc.planePoint] as [number, number, number],
        planeNormal: [...mc.planeNormal] as [number, number, number],
        cpPairs: mc.cpPairs.map((pair: any) => ({
          source: getControlPoint(pair.source, 1),
          mirror: getControlPoint(pair.mirror, 1),
        })),
      };
    }
  }

  return scene;
}
