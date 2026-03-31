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
import {BooleanAlgorithm} from "brep/operations/boolean";
import Vector from "math/vector";
import {ProductionAnalyzer} from "cad/craft/production/productionAnalyzer";

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
                       analyzerCreator?: (targets: MObject[], tools: MObject[]) => ProductionAnalyzer): OperationResult;
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

  function applyBooleanModifier(tools: MBrepShell[],
                                booleanDef: BooleanDefinition,
                                sketchSource: MObject,
                                mustAdvance? : MObject[],
                                analyzerCreator?: (targets: MObject[], tools: MObject[]) => ProductionAnalyzer): OperationResult {

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

    let resultShell: Shell = targetShells[0].brepShell.clone();

    for (let i = 1; i < targetShells.length; i++) {
      resultShell = BooleanAlgorithm(resultShell, targetShells[i].brepShell.clone(), 'UNION');
    }

    for (const tool of tools) {
      const toolShell = tool.brepShell.clone();
      resultShell = BooleanAlgorithm(resultShell, toolShell, kind);
    }

    targets.forEach(t => consumed.push(t));
    tools.forEach(t => consumed.push(t));

    const resultMShell = new MBrepShell(resultShell);

    return {
      consumed,
      created: [resultMShell]
    };
  }

  return {
    sketchToProfiles, extrudeProfile, applyBooleanModifier
  };
}
