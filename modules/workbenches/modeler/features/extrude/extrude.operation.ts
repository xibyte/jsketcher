import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MBrepFace, MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import Vector, {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MBrepShell} from "cad/model/mshell";
import BrepCurve from "geom/curves/brepCurve";
import {Plane} from "geom/impl/plane";
import {enclose} from "brep/operations/brep-enclose";
import {Shell} from "brep/topo/shell";
import {buildExtrusionMesh, ExtrudedMeshResult} from "brep/operations/mesh/extrudeMesh";
import {ShellMesh} from "cad/model/mshell";
import icon from "./EXTRUDE.svg";
import cutIcon from "./CUT.svg";

/**
 * Build a shared ShellMesh from extruded mesh result.
 * All triangles go into one flat buffer. Each MFace gets a range [start, end).
 *
 * MFace ordering in MBrepShell: [wall0..wallN-1, base, lid]
 * Mesh faceID ordering: 0=bottom, 1=top, 2..n+1=walls
 */
function buildShellMesh(extResult: ExtrudedMeshResult, mFaceCount: number, nBrepWalls: number): ShellMesh {
  const allVerts: number[] = [];
  const allNormals: number[] = [];

  // We'll collect triangles grouped by MFace index
  // MFace order: [wall0..wallN-1, base, lid]
  const faceTriBuckets: number[][][] = Array.from({length: mFaceCount}, () => []);

  const baseIdx = mFaceCount - 2; // MFace index for base
  const lidIdx = mFaceCount - 1;  // MFace index for lid

  // Bottom cap tris → base MFace
  for (const [verts] of extResult.bottomTess) {
    faceTriBuckets[baseIdx].push(verts);
  }

  // Top cap tris → lid MFace
  for (const [verts] of extResult.topTess) {
    faceTriBuckets[lidIdx].push(verts);
  }

  // Wall tris → distribute across BRep wall MFaces
  const nMeshWalls = extResult.wallTess.length;
  for (let si = 0; si < nMeshWalls; si++) {
    const wi = Math.min(nBrepWalls - 1, Math.floor(si * nBrepWalls / nMeshWalls));
    for (const [verts] of extResult.wallTess[si]) {
      faceTriBuckets[wi].push(verts);
    }
  }

  // Flatten into one buffer with per-face ranges
  const faceTriRanges: [number, number][] = [];
  let triIdx = 0;

  for (let fi = 0; fi < mFaceCount; fi++) {
    const startTri = triIdx;
    for (const verts of faceTriBuckets[fi]) {
      for (const v of verts) {
        allVerts.push(v[0], v[1], v[2]);
      }
      // Compute flat normal
      const a = verts[0], b = verts[1], c = verts[2];
      const abx = b[0]-a[0], aby = b[1]-a[1], abz = b[2]-a[2];
      const acx = c[0]-a[0], acy = c[1]-a[1], acz = c[2]-a[2];
      let nx = aby*acz - abz*acy, ny = abz*acx - abx*acz, nz = abx*acy - aby*acx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
      if (len > 0) { nx /= len; ny /= len; nz /= len; }
      allNormals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
      triIdx++;
    }
    faceTriRanges.push([startTri, triIdx]);
  }

  return {
    vertices: new Float32Array(allVerts),
    normals: new Float32Array(allNormals),
    faceTriRanges,
  };
}


interface ExtrudeParams {
  length: number;
  doubleSided:boolean,
  face: MFace;
  direction?: UnitVector,
  boolean: BooleanDefinition,
  meshTolerance?: number,
  meshSimplifyTolerance?: number,
  vertexSnapTolerance?: number,
  edgeGroupingTolerance?: number,
}

function extrudeShellFromFace(face: MBrepFace, extrusionVector: Vector): Shell {
  const brepFace = face.brepFace;
  const baseCurves: BrepCurve[] = [];

  for (const he of brepFace.outerLoop.halfEdges) {
    baseCurves.push(he.edge.curve);
  }

  const normal = brepFace.surface.normalInMiddle()._normalize();
  const point = brepFace.outerLoop.halfEdges[0].vertexA.point;
  const basePlane = new Plane(normal, normal.dot(point));

  const lidCurves = baseCurves.map(c => c.translate(extrusionVector));
  const lidPlane = basePlane.translate(extrusionVector).invert();

  return enclose(baseCurves, lidCurves, basePlane, lidPlane);
}

function extrudeShellFromSketch(contourCurves: BrepCurve[], extrusionVector: Vector, csys: any): Shell {
  const normal = csys.z;
  const origin = contourCurves[0].startPoint();
  const basePlane = new Plane(normal, normal.dot(origin));

  const lidCurves = contourCurves.map(c => c.translate(extrusionVector));
  const lidPlane = basePlane.translate(extrusionVector).invert();

  return enclose(contourCurves, lidCurves, basePlane, lidPlane);
}

export const ExtrudeOperation: OperationDescriptor<ExtrudeParams> = {
  id: 'EXTRUDE',
  label: 'Extrude',
  dynamicLabel: params => {
    switch (params.boolean?.kind) {
      case 'SUBTRACT': return 'Extrude-Cut';
      case 'INTERSECT': return 'Extrude-Intersect';
      case 'UNION': return 'Extrude-Fuse';
    }
    return null;
  },
  dynamicIcon: params => {
    switch (params.boolean?.kind) {
      case 'SUBTRACT': return cutIcon;
    }
    return null;
  },
  icon: icon,
  info: 'extrudes 2D sketch',
  path:__dirname,
  paramsInfo: ({length}) => `(${r(length)})`,
  run: (params: ExtrudeParams, ctx: ApplicationContext, rawParams: any) => {

    const face = params.face;

    let dir: UnitVector;
    if (params.direction) {
      dir = params.direction.normalize();
    } else {
      dir = face.normal().normalize();
      if (rawParams.direction?.flip) {
        dir._negate();
      }
    }
    const extrusionVector = dir._multiply(params.length);

    const sketchId = face.id;
    const sketch = ctx.sketchStorageService.readSketch(sketchId);

    if (!sketch) {
      if (face instanceof MBrepFace) {
        // Get contour points from the BRep face's outer loop
        const brepFace = face.brepFace;
        const contourPoints: Vector[] = [];
        for (const he of brepFace.outerLoop.halfEdges) {
          const tess = he.edge.curve.tessellate();
          if (he.inverted) tess.reverse();
          tess.pop(); // remove last (= next edge's first)
          for (const p of tess) contourPoints.push(p);
        }

        const faceNormal = brepFace.surface.normalInMiddle()._normalize();
        const extResult = buildExtrusionMesh(contourPoints, extrusionVector, faceNormal);

        const shell = extrudeShellFromFace(face, extrusionVector);

        const nFaces = shell.faces.length;
        const nBrepWalls = nFaces - 2;
        const baseFace = shell.faces[nFaces - 2];
        const lidFace = shell.faces[nFaces - 1];
        const nMeshWalls = contourPoints.length;

        const originMap: any = {};
        originMap[0] = {brepFace: baseFace, surface: baseFace.surface};
        originMap[1] = {brepFace: lidFace, surface: lidFace.surface};
        for (let si = 0; si < nMeshWalls; si++) {
          const wi = Math.min(nBrepWalls - 1, Math.floor(si * nBrepWalls / nMeshWalls));
          originMap[2 + si] = {brepFace: shell.faces[wi], surface: shell.faces[wi].surface};
        }

        shell.data.__meshWithOrigins = {meshData: extResult.meshData, originMap};

        const toolShell = new MBrepShell(shell);
        toolShell.mesh = buildShellMesh(extResult, toolShell.faces.length, nBrepWalls);

        return ctx.nativeService.applyBooleanModifier([toolShell], params.boolean, face, []);
      } else {
        throw "can't extrude an empty surface";
      }
    }

    let csys = face.csys;
    if (params.doubleSided) {
      csys = csys.clone();
      csys.origin._minus(extrusionVector);
      extrusionVector._scale(2);
    }

    const contours = sketch.fetchContours();

    const tools: MBrepShell[] = contours.map(contour => {
      const contourPoints = contour.tessellateInCoordinateSystem(csys);
      const extResult = buildExtrusionMesh(contourPoints, extrusionVector, csys.z);

      // Build BRep shell for topology
      const curves3D = contour.transferInCoordinateSystem(csys);
      const shell = extrudeShellFromSketch(curves3D, extrusionVector, csys);

      const nFaces = shell.faces.length;
      const nBrepWalls = nFaces - 2;
      const baseFace = shell.faces[nFaces - 2];
      const lidFace = shell.faces[nFaces - 1];
      const nMeshWalls = contourPoints.length;

      // Build origin map: meshFaceID → BRep face
      const originMap: any = {};
      originMap[0] = {brepFace: baseFace, surface: baseFace.surface};
      originMap[1] = {brepFace: lidFace, surface: lidFace.surface};
      for (let si = 0; si < nMeshWalls; si++) {
        const wi = Math.min(nBrepWalls - 1, Math.floor(si * nBrepWalls / nMeshWalls));
        originMap[2 + si] = {brepFace: shell.faces[wi], surface: shell.faces[wi].surface};
      }

      // Store mesh data on Shell.data so it survives model rebuilds
      // (Shell.data is preserved through clone and MBrepShell reconstruction)
      shell.data.__meshWithOrigins = {
        meshData: extResult.meshData,
        originMap,
      };

      const mShell = new MBrepShell(shell);

      // Build shared mesh buffer on the MShell
      mShell.mesh = buildShellMesh(extResult, mShell.faces.length, nBrepWalls);

      return mShell;
    });

    // Attach tolerances to the boolean definition for the boolean pipeline
    const boolWithTolerances = params.boolean ? {
      ...params.boolean,
      tolerances: {
        meshTolerance: parseFloat(params.meshTolerance as any) || 0,
        meshSimplifyTolerance: parseFloat(params.meshSimplifyTolerance as any) || 0,
        vertexSnapTolerance: parseFloat(params.vertexSnapTolerance as any) || 1e-4,
        edgeGroupingTolerance: parseFloat(params.edgeGroupingTolerance as any) || 1e-4,
      }
    } : params.boolean;

    return ctx.nativeService.applyBooleanModifier(tools, boolWithTolerances, face, [face]);

  },

  form: [
    {
      type: 'number',
      label: 'length',
      name: 'length',
      defaultValue: 50,
    },
    {
      type: 'checkbox',
      label: 'Double Sided',
      name: 'doubleSided',
      defaultValue: false,
    },
    {
      type: 'selection',
      name: 'face',
      capture: [EntityKind.FACE],
      label: 'face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'direction',
      name: 'direction',
      label: 'direction',
      optional: true
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    },
    {
      type: 'number',
      name: 'meshTolerance',
      label: 'Mesh Tolerance',
      defaultValue: '',
      placeholder: '0',
      optional: true,
    },
    {
      type: 'number',
      name: 'meshSimplifyTolerance',
      label: 'Simplify Tolerance',
      defaultValue: '',
      placeholder: '0',
      optional: true,
    },
    {
      type: 'number',
      name: 'vertexSnapTolerance',
      label: 'Vertex Snap',
      defaultValue: '',
      placeholder: '0.0001',
      optional: true,
    },
    {
      type: 'number',
      name: 'edgeGroupingTolerance',
      label: 'Edge Grouping',
      defaultValue: '',
      placeholder: '0.0001',
      optional: true,
    },

  ],

  defaultActiveField: 'face',

  masking: [
    {
      id: 'CUT',
      label: 'Cut',
      icon: cutIcon,
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        direction: {
          flip: true
        },
        boolean: {
          kind: 'SUBTRACT'
        }
      }
    }
  ]
}
