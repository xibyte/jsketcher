import { SketchGeom } from "cad/sketch/sketchReader";
import { ApplicationContext } from "cad/context";
import CSys from "math/csys";
import { OperationResult } from "cad/craft/craftBundle";
import { BooleanDefinition, BooleanKind } from "cad/craft/schema/common/BooleanDefinition";
import { WireRef } from "cad/craft/e0/occSketchLoader";
import { FromMObjectProductionAnalyzer, ProductionAnalyzer } from "cad/craft/production/productionAnalyzer";
import { MObject } from "cad/model/mobject";
import { Shell } from "brep/topo/shell";
import { MOpenFaceShell } from "cad/model/mopenFace";

export interface OCCUtils {

  wiresToFaces(wires: WireRef[]): FaceRef[];

  sketchToFaces(sketch: SketchGeom, csys: CSys): FaceRef[];

  sketchToFace(sketch: SketchGeom, csys: CSys): FaceRef[];

  applyBooleanModifier(tools: MObject[],
    booleanDef: BooleanDefinition,
    sketchSource?: MObject,
    mustAdvance?: MObject[],
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


  function sketchToFace(sketch: SketchGeom, csys: CSys): FaceRef[] {
    const occ = ctx.occService;

    const wires = occ.io.sketchLoader.pushSketchAsWires(sketch.contours, csys);
    return wiresToFace(wires);
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



  function wiresToFace(wires: WireRef[]): FaceRef[] {
    const oci = ctx.occService.commandInterface;
    const faceName = "Face";
    oci.mkplane(faceName, wires[0].wire);
    const brepShell = ctx.occService.io.getLightShell(faceName);

    wires.forEach((wire, index) => {
      if (index == 0) return;
      oci.add(faceName, wire.wire);
    })


    return [{
      face: faceName,
      topoShape: brepShell,
    
    }]

  }


  function applyBooleanModifier(tools: MObject[],
    booleanDef: BooleanDefinition,
    sketchSource: MObject,
    mustAdvance?: MObject[],
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


      oci.boptions("-default");
      oci.bclearobjects();
      oci.bcleartools();

      targetNames.forEach(targetName => oci.baddobjects(targetName));
      tools.forEach(tool => {
        oci.baddtools(tool)
        oci.settolerance(tool, 0.0001);
      });
      if (booleanDef.simplify === true) {
        oci.bsimplify("-e", 1, "-f", 1);
      } else {
        oci.bsimplify("-e", 0, "-f", 0);
      }
      oci.bfuzzyvalue(0.0001);
      oci.bcheckinverted(1);
      oci.buseobb(1);
      oci.bfillds();
      oci.bapibop("BooleanResult", booleanKindToOCCBopType(kind));


      if (booleanDef.simplify === true) oci.unifysamedom("BooleanResult", "BooleanResult");

      targets.forEach(t => consumed.push(t));
      tools.forEach(t => consumed.push(t));

      const booleanProdAnalyzer = analyzerCreator ? analyzerCreator(targets, tools)
        : new FromMObjectProductionAnalyzer([...targets, ...tools], mustAdvance);

      return {
        consumed,
        created: [occ.io.getShell("BooleanResult", booleanProdAnalyzer)]
      }
    }
  }


  return {
    wiresToFaces, sketchToFaces, applyBooleanModifier, wiresToFace, sketchToFace,
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