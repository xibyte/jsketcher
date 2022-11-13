import { SketchGeom } from "cad/sketch/sketchReader";
import { ApplicationContext } from "cad/context";
import CSys from "math/csys";
import {OperationResult} from "cad/craft/craftBundle";
import {BooleanDefinition, BooleanKind} from "cad/craft/schema/common/BooleanDefinition";
import {WireRef} from "cad/craft/e0/occSketchLoader";
import {FromMObjectProductionAnalyzer, ProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import {MObject} from "cad/model/mobject";
import {Shell} from "brep/topo/shell";
import {MOpenFaceShell} from "cad/model/mopenFace";

export interface OCCUtils {

  wiresToFaces(wires: WireRef[]): FaceRef[];

  sketchToFaces(sketch: SketchGeom, csys: CSys): FaceRef[];

  applyBooleanModifier(tools: MObject[],
                       booleanDef: BooleanDefinition,
                       sketchSource?: MObject,
                       mustAdvance? : MObject[],
                       analyzerCreator?: (targets: MObject[], tools: MObject[]) => ProductionAnalyzer): OperationResult;
}

export interface FaceRef extends WireRef {
  face: string;
  topoShape: Shell,
}

export function createOCCUtils(ctx: ApplicationContext): OCCUtils {

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
      const brepShell = ctx.occService.io.getLightShell(faceName);

      return {
        face: faceName,
        topoShape: brepShell,
        ...wire
      };
    });
  }


  function applyBooleanModifier(tools: MObject[],
                                booleanDef: BooleanDefinition,
                                sketchSource: MObject,
                                mustAdvance? : MObject[],
                                analyzerCreator?: (targets: MObject[], tools: MObject[]) => ProductionAnalyzer): OperationResult {
    const occ = ctx.occService;
    const oci = ctx.occService.commandInterface;

    const consumed = [];

    if (sketchSource && sketchSource.parent instanceof MOpenFaceShell) {
      consumed.push(sketchSource.parent);
    }

    if (!booleanDef || booleanDef.kind === 'NONE') {

      return {
        created: tools,
        consumed
      }

    } else {

      const kind = booleanDef.kind;

      let targets = booleanDef.targets;
      if (!targets || targets.length === 0) {
        targets = ctx.cadRegistry.shells;
      }
      

      const targetNames = targets.map((target, i) => {
        const targetName = 'Target/' + i;
        const wasPushed = ctx.occService.io.pushModel(target, targetName);
        if (!wasPushed) {
          return null;
        }
        return targetName;
      }).filter(targetName => !!targetName);




      oci.bclearobjects();
      oci.bcleartools();

      targetNames.forEach(targetName => oci.baddobjects(targetName));
      tools.forEach(tool => oci.baddtools(tool));
      console.log("booleanDef", booleanDef);
      if (booleanDef.simplify === true){
        oci.bsimplify("-e", 1, "-f", 1);
      }else{
        oci.bsimplify("-e", 0, "-f", 0);
      }
      oci.bfuzzyvalue(0.0001);
      oci.bcheckinverted(1);
      oci.bfillds();
      oci.bapibop("BooleanResult", booleanKindToOCCBopType(kind));

      // let resultShell = occ.io.getShell("BooleanResult");
      // if (resultShell.edges.length < 0) {

        // oci.bsimplify("-e", 0, "-f", 0);
        // oci.baddobjects("BooleanResult");
        // oci.baddtools("BooleanResult");

        // oci.bcheckinverted(1);
        // oci.bfillds();
        // oci.bapibop("BooleanResult", OccBBOPTypes.FUSE);

      // }

      oci.fixshape("BooleanResultResult", "BooleanResult");

      targets.forEach(t => consumed.push(t));
      tools.forEach(t => consumed.push(t));

      const booleanProdAnalyzer = analyzerCreator ? analyzerCreator(targets, tools)
        : new FromMObjectProductionAnalyzer([...targets, ...tools], mustAdvance);

      return {
        consumed,
        created: [occ.io.getShell("BooleanResultResult", booleanProdAnalyzer)]
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