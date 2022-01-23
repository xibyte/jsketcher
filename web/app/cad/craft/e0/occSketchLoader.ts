import {Contour} from "cad/sketch/sketchModel";
import {OCCCommandInterface} from "cad/craft/e0/occCommandInterface";

export interface OCCSketchLoader {

  pushSketchAsWires(sketch: Contour[]): string[];

  pushContourAsWire(contour: Contour, id: string|number): string;

}

export function createOCCSketchLoader(oci: OCCCommandInterface): OCCSketchLoader {

  function pushContourAsWire(contour: Contour, id: string|number): string {

    const boundCurves = contour.segments.map(s => {
      const geomId = "SketchGeom:" + s.id;
      s.toOCCGeometry(oci, geomId);
      return geomId;
    });

    const edges = boundCurves.map(geomId => {
      const edgeName = "Edge/" + geomId;
      oci.mkedge(edgeName, geomId);
      return edgeName;
    });

    const wireName = "Wire:" + id;

    oci.wire(wireName, ...edges);

    return wireName;

  }

  const pushSketchAsWires = (sketch: Contour[]): string[] => sketch.map(pushContourAsWire);

  return {
    pushSketchAsWires, pushContourAsWire
  }

}