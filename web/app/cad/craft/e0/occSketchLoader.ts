import {Contour} from "cad/sketch/sketchModel";
import {OCCCommandInterface} from "cad/craft/e0/occCommandInterface";
import CSys from "math/csys";

export interface WireRef {

  wire?: string;

  edges?: string[];

  curves?: string[];

  contour?: Contour;
}

export interface OCCSketchLoader {

  pushSketchAsWires(sketch: Contour[], csys: CSys): WireRef[];

  pushContourAsWire(contour: Contour, id: string|number, csys: CSys): WireRef;

}

export function createOCCSketchLoader(oci: OCCCommandInterface): OCCSketchLoader {

  function pushContourAsWire(contour: Contour, id: string|number, csys: CSys): WireRef {

    const boundCurves = contour.segments.map(s => {
      const geomId = "SketchGeom:" + s.id;
      s.toOCCGeometry(oci, geomId, csys);
      return geomId;
    });

    const edges = boundCurves.map(geomId => {
      const edgeName = "Edge/" + geomId;
      oci.mkedge(edgeName, geomId);
      return edgeName;
    });

    const wireName = "Wire:" + id;

    oci.wire(wireName, ...edges);

    return {
      wire: wireName,
      edges,
      curves: boundCurves,
      contour
    };
  }

  const pushSketchAsWires = (sketch: Contour[], csys: CSys): WireRef[] => sketch.map((c, i) => pushContourAsWire(c, i, csys));

  return {
    pushSketchAsWires, pushContourAsWire
  }

}