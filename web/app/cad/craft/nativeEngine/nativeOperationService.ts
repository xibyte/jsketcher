import {SketchGeom} from "cad/sketch/sketchReader";
import {ApplicationContext} from "cad/context";
import CSys from "math/csys";
import {OperationResult} from "cad/craft/craftBundle";
import {BooleanDefinition, BooleanKind} from "cad/craft/schema/common/BooleanDefinition";
import {MObject} from "cad/model/mobject";
import {Shell} from "brep/topo/shell";
import {MOpenFaceShell} from "cad/model/mopenFace";
import {MBrepShell} from "cad/model/mshell";
import {Contour} from "cad/sketch/sketchModel";
import BrepCurve from "geom/curves/brepCurve";
import {Plane} from "geom/impl/plane";
import {enclose} from "brep/operations/brep-enclose";
import Vector from "math/vector";
import {ProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import {manifoldBooleanRaw, BooleanOp, MeshWithOrigins, shellToMeshWithOrigins, ManifoldTolerances} from "brep/operations/mesh/manifoldBoolean";
import {ShellMesh, MBrepShell as MBrepShellType} from "cad/model/mshell";

export interface SketchProfile {
  contour: Contour;
  shell: Shell;
}

export interface NativeOperationService {

  sketchToProfiles(sketch: SketchGeom, csys: CSys): SketchProfile[];

  extrudeProfile(profile: SketchProfile, extrusionVector: Vector, csys: CSys): Shell;

  applyBooleanModifier(tools: MBrepShell[],
                       booleanDef: BooleanDefinition,
                       sketchSource?: MObject,
                       mustAdvance? : MObject[],
                       analyzerCreator?: (targets: MObject[], tools: MObject[]) => ProductionAnalyzer): OperationResult | Promise<OperationResult>;
}

export function createNativeOperationService(ctx: ApplicationContext): NativeOperationService {

  function sketchToProfiles(sketch: SketchGeom, csys: CSys): SketchProfile[] {
    const contours = sketch.fetchContours();
    return contours.map(contour => {
      const curves3D = contour.transferInCoordinateSystem(csys);
      const tessPoints = contour.tessellateInCoordinateSystem(csys);

      const normal = csys.z._normalize();
      const origin = csys.outTransformation.apply((contour.segments[0] as any).a || (contour.segments[0] as any).c);
      const basePlane = new Plane(normal, normal.dot(origin));

      return {
        contour,
        shell: null,
        curves3D,
        tessPoints,
        basePlane,
      } as SketchProfile & { curves3D: BrepCurve[], tessPoints: Vector[], basePlane: Plane };
    });
  }

  function extrudeProfile(profile: SketchProfile & { curves3D?: BrepCurve[], basePlane?: Plane },
                          extrusionVector: Vector, csys: CSys): Shell {

    let baseCurves: BrepCurve[];
    let basePlane: Plane;

    if (profile.curves3D && profile.basePlane) {
      baseCurves = profile.curves3D;
      basePlane = profile.basePlane;
    } else {
      baseCurves = profile.contour.transferInCoordinateSystem(csys);
      const normal = csys.z._normalize();
      const origin = csys.outTransformation.apply(
        (profile.contour.segments[0] as any).a || (profile.contour.segments[0] as any).c
      );
      basePlane = new Plane(normal, normal.dot(origin));
    }

    const lidCurves = baseCurves.map(c => c.translate(extrusionVector));
    const lidPlane = basePlane.translate(extrusionVector).invert();

    return enclose(baseCurves, lidCurves, basePlane, lidPlane);
  }

  async function applyBooleanModifier(tools: MBrepShell[],
                                booleanDef: BooleanDefinition,
                                sketchSource: MObject,
                                mustAdvance? : MObject[],
                                analyzerCreator?: (targets: MObject[], tools: MObject[]) => ProductionAnalyzer): Promise<OperationResult> {

    const consumed: MObject[] = [];

    if (sketchSource && sketchSource.parent instanceof MOpenFaceShell) {
      consumed.push(sketchSource.parent);
    }

    if (!booleanDef || booleanDef.kind === 'NONE') {
      return {
        created: tools,
        consumed
      };
    }

    const kind = booleanDef.kind;

    let targets: MObject[] = booleanDef.targets;
    if (!targets || targets.length === 0) {
      targets = ctx.cadRegistry.shells;
    }

    const targetShells: MBrepShell[] = targets.filter(
      t => t instanceof MBrepShell
    ) as MBrepShell[];

    if (targetShells.length === 0) {
      return {
        created: tools,
        consumed
      };
    }

    const opMap: Record<string, BooleanOp> = {
      'UNION': 'union', 'SUBTRACT': 'subtract', 'INTERSECT': 'intersect'
    };

    // Extract tolerances from boolean definition if provided
    const tolerances: ManifoldTolerances = (booleanDef as any)?.tolerances || {};

    function getMeshWithOrigins(mShell: MBrepShell): MeshWithOrigins {
      const shell = mShell.brepShell;
      const mwo = shell.data?.__meshWithOrigins
        || (shell as any).__meshWithOrigins
        || (mShell as any).__meshWithOrigins;
      if (mwo) return mwo;
      throw new Error('Shell has no mesh data. Every solid must be created with buildExtrusionMesh.');
    }

    let current = getMeshWithOrigins(targetShells[0]);
    let resultShell: Shell = targetShells[0].brepShell;

    for (let i = 1; i < targetShells.length; i++) {
      const boolResult = await manifoldBooleanRaw(
        current, getMeshWithOrigins(targetShells[i]), 'union', tolerances
      );
      resultShell = boolResult.shell;
      current = boolResult.meshWithOrigins;
    }

    for (const tool of tools) {
      const boolResult = await manifoldBooleanRaw(
        current, getMeshWithOrigins(tool), opMap[kind] || 'subtract', tolerances
      );
      resultShell = boolResult.shell;
      current = boolResult.meshWithOrigins;
    }

    targets.forEach(t => consumed.push(t));
    tools.forEach(t => consumed.push(t));

    const resultMShell = new MBrepShell(resultShell);

    // Build shared mesh on result shell from face tessellation data
    resultMShell.mesh = buildShellMeshFromTessData(resultMShell);

    return {
      consumed,
      created: [resultMShell]
    };
  }

  return {
    sketchToProfiles, extrudeProfile, applyBooleanModifier
  };
}

function buildShellMeshFromTessData(mShell: any): ShellMesh {
  const allVerts: number[] = [];
  const allNormals: number[] = [];
  const faceTriRanges: [number, number][] = [];
  let triIdx = 0;

  for (const mFace of mShell.faces) {
    const startTri = triIdx;
    const tessData = mFace.brepFace?.data?.tessellation?.data;
    if (tessData) {
      for (const [verts] of tessData) {
        for (const v of verts) {
          allVerts.push(v[0], v[1], v[2]);
        }
        const a = verts[0], b = verts[1], c = verts[2];
        const abx = b[0]-a[0], aby = b[1]-a[1], abz = b[2]-a[2];
        const acx = c[0]-a[0], acy = c[1]-a[1], acz = c[2]-a[2];
        let nx = aby*acz-abz*acy, ny = abz*acx-abx*acz, nz = abx*acy-aby*acx;
        const len = Math.sqrt(nx*nx+ny*ny+nz*nz);
        if (len > 0) { nx/=len; ny/=len; nz/=len; }
        allNormals.push(nx,ny,nz, nx,ny,nz, nx,ny,nz);
        triIdx++;
      }
    }
    faceTriRanges.push([startTri, triIdx]);
  }

  return {
    vertices: new Float32Array(allVerts),
    normals: new Float32Array(allNormals),
    faceTriRanges,
  };
}
