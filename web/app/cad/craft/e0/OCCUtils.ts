import {SketchGeom} from "cad/sketch/sketchReader";
import {CoreContext} from "context";
import CSys from "math/csys";
import {OperationResult} from "cad/craft/craftPlugin";
import {BooleanDefinition, BooleanKind} from "cad/craft/schema/common/BooleanDefinition";
import {MShell} from "cad/model/mshell";
import {WireRef} from "cad/craft/e0/occSketchLoader";

export interface OCCUtils {

  wiresToFaces(wires: WireRef[]): FaceRef[];

  sketchToFaces(sketch: SketchGeom, csys: CSys): FaceRef[];

  // applyBoolean(tools: string[], kind: BooleanKind): string[];

  applyBooleanModifier(tools: string[], booleanDef?: BooleanDefinition): OperationResult;
}

export interface FaceRef extends WireRef {
  face: string;
}

export function createOCCUtils(ctx: CoreContext): OCCUtils {

  function sketchToFaces(sketch: SketchGeom, csys: CSys): FaceRef[] {
    const occ = ctx.occService;
    const wires = occ.io.sketchLoader.pushSketchAsWires(sketch.contours, csys);
    return wiresToFaces(wires);
  }

  function wiresToFaces(wires: WireRef[]): FaceRef[] {
    const oci = ctx.occService.commandInterface;
    return wires.map((wire, i) => {
      const faceName = "Face/" + i;
      oci.mkplane(faceName, wire.wire);
      return {
        face: faceName,
        ...wire
      };
    });
  }

  function applyBooleanModifier(tools: string[], booleanDef?: BooleanDefinition): OperationResult {
    const occ = ctx.occService;
    const oci = ctx.occService.commandInterface;

    if (!booleanDef || booleanDef.kind === 'NONE') {

      return {
        created: tools.map(shapeName => occ.io.getShell(shapeName)),
        consumed: []
      }

    } else {
      const kind = booleanDef.kind;

      let targets = booleanDef.targets;
      if (!targets || targets.length === 0) {
        targets = ctx.cadRegistry.shells;
      }
      

      let targetNames = targets.map((target, i) => {
        const targetName = 'Target/' + i;
        const wasPushed = ctx.occService.io.pushModel(target, targetName);
        if (!wasPushed) {
          return null;
        }
        return targetName;
      }).filter(targetName => !!targetName);

      oci.bsimplify("-e", 1, "-f", 1);
      //oci.bglue(2);
      oci.bfuzzyvalue(0.0001);
      oci.bclearobjects();
      oci.bcleartools();

      targetNames.forEach(targetName => oci.baddobjects(targetName));
      tools.forEach(toolName => oci.baddtools(toolName));
      oci.bcheckinverted(1);
      oci.bfillds();
      oci.bapibop("BooleanResult", booleanKindToOCCBopType(kind));

      return {
        consumed: targets,
        created: [occ.io.getShell("BooleanResult", targets as MShell[])]
      }
    }
  }

 
  return {
    wiresToFaces, sketchToFaces, applyBooleanModifier
  }

}

enum OccBBOPTypes {
  COMMON,
  FUSE,
  CUT,
  CUT21,
}

function booleanKindToOCCBopType(kind: BooleanKind): number {
  switch (kind) {
    case "INTERSECT": return OccBBOPTypes.COMMON;
    case "UNION": return OccBBOPTypes.FUSE;
    case "SUBTRACT": return OccBBOPTypes.CUT;
    default: throw 'unsupported boolean kind: ' + kind;
  }
}