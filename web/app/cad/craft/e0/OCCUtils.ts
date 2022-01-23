import {OCCCommandInterface} from "cad/craft/e0/occCommandInterface";
import {Vec3} from "math/vec";
import {SketchGeom} from "cad/sketch/sketchReader";
import {OCCService} from "cad/craft/e0/occService";
import {CoreContext} from "context";

export interface OCCUtils {

  wiresToFaces(wires: string[]): string[];

  sketchToFaces(sketch: SketchGeom): string[];

  prism(faces: string[], dir: Vec3): string[];

}

export function createOCCUtils(ctx: CoreContext): OCCUtils {

  function sketchToFaces(sketch: SketchGeom): string[] {
    const occ = ctx.occService;
    const wires = occ.io.sketchLoader.pushSketchAsWires(sketch.contours);
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

  function prism(faces: string[], dir: Vec3): string[] {
    const oci = ctx.occService.commandInterface;
    return faces.map((faceName, i) => {

      const shapeName = "Shape:" + i;

      oci.prism(shapeName, faceName, ...dir)

      // occIterateFaces(oc, shape, face => {
      //   let role;
      //   if (face.IsSame(prismAPI.FirstShape())) {
      //     role = "bottom";
      //   } else if (face.IsSame(prismAPI.LastShape())) {
      //     role = "top";
      //   } else {
      //     role = "sweep";
      //   }
      //   getProductionInfo(face).role = role;
      // });
      //
      // occIterateEdges(oc, wire, edge => {
      //   const generatedList = prismAPI.Generated(edge);
      //   occIterateListOfShape(oc, generatedList, face => {
      //     console.log(face);
      //   })
      // })

      return shapeName;
    });
  }

  return {
    wiresToFaces, sketchToFaces, prism
  }

}