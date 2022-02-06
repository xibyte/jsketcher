import {OCCCommandInterface} from "cad/craft/e0/occCommandInterface";
import {Vec3} from "math/vec";
import {SketchGeom} from "cad/sketch/sketchReader";
import {OCCService} from "cad/craft/e0/occService";
import {CoreContext} from "context";
import CSys from "math/csys";
import {OperationResult} from "cad/craft/craftPlugin";
import {MShell} from "cad/model/mshell";
import {BooleanDefinition, BooleanKind} from "cad/craft/schema/common/BooleanDefinition";
import {bool} from "prop-types";

export interface OCCUtils {

  wiresToFaces(wires: string[]): string[];

  sketchToFaces(sketch: SketchGeom, csys: CSys): string[];

  // applyBoolean(tools: string[], kind: BooleanKind): string[];

  applyBooleanModifier(tools: string[], booleanDef?: BooleanDefinition): OperationResult;
}

export function createOCCUtils(ctx: CoreContext): OCCUtils {

  function sketchToFaces(sketch: SketchGeom, csys: CSys): string[] {
    const occ = ctx.occService;
    const wires = occ.io.sketchLoader.pushSketchAsWires(sketch.contours, csys);
    return wiresToFaces(wires);
  }

  function wiresToFaces(wires: string[]): string[] {
    const oci = ctx.occService.commandInterface;
    return wires.map((wire, i) => {
      const faceName = "Face/" + i;
      oci.mkplane(faceName, wire);
      return faceName;
    });
  }


  function applyBoolean(tools: string[], target: string[], kind: BooleanKind): string[] {



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
      if (targets.length === 0) {
        targets = ctx.cadRegistry.shells;
      }

      let targetNames = targets.map((target, i) => {
        const targetName = 'Target:' + i;
        ctx.occService.io.pushModel(target, targetName)
        return targetName;
      });

      oci.bfuzzyvalue(0.0001);
      oci.bclearobjects();
      oci.bcleartools();

      targetNames.forEach(targetName => oci.baddobjects(targetName));
      tools.forEach(toolName => oci.baddtools(toolName));

      oci.bfillds();
      oci.bcbuild("BooleanResult");

      // oci.bopcommon("result");
//oci.bopfuse("result");
//oci.bopcut("result");

      return {
        consumed: targets,
        created: tools.map(shapeName => occ.io.getShell(shapeName), targets)
      }


    }



  }


  return {
    wiresToFaces, sketchToFaces, applyBooleanModifier
  }

}