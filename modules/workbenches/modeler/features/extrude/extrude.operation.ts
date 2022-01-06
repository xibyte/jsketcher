import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {occIterateEdges, occIterateFaces, occIterateListOfShape, upcastCurve} from "occ/occUtils";
import {occShapeKey} from "cad/occ/occ2models";
import {ProductionInfo} from "cad/model/productionInfo";
import {vectorTo_gp_Vector} from "occ/occAdapters";

export default {
  id: 'EXTRUDE',
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo: ({value}) => `(${r(value)})`,
  mutualExclusiveFields: ['datumAxisVector', 'edgeVector', 'sketchSegmentVector'],
  run: (params, ctx) => {

    const oci = ctx.OCI.occService.occContext;
    const face = ctx.cadRegistry.findFace(params.face);

    let sketch = ctx.sketchStorageService.readSketch(face.id);
    if (!sketch) throw 'sketch not found for the face ' + face.id;
    let contours = sketch.fetchContours();
    const wires = contours.map(c => {
      const wireMaker = new oc.BRepBuilderAPI_MakeWire_1();
      const boundCurves = c.segments.map(s => upcastCurve(oc, s.toOCCGeometry(oc)));
      const edges = boundCurves.map(curve => new oc.BRepBuilderAPI_MakeEdge_24(curve).Edge());
      edges.forEach(edge => wireMaker.Add_1(edge))
      return wireMaker.Wire();
    });


    const shapeData = new Map<string, ProductionInfo>();

    function getProductionInfo(face) {
      const faceKey = occShapeKey(face);

      let productionInfo = shapeData.get(faceKey);
      if (!productionInfo) {
        productionInfo = new ProductionInfo();
        shapeData.set(faceKey, productionInfo);
      }
      return productionInfo;
    }

    const prismVec = vectorTo_gp_Vector(oc, face.csys.z.multiply(params.length));

    for (let wire of wires) {

      const profile = new oc.BRepBuilderAPI_MakeFace_15(wire, false).Face();

      const prismAPI = new oc.BRepPrimAPI_MakePrism_1(profile, prismVec, false, true);
      const shape = prismAPI.Shape();

      occIterateFaces(oc, shape, face => {
        let role;
        if (face.IsSame(prismAPI.FirstShape())) {
          role = "bottom";
        } else if (face.IsSame(prismAPI.LastShape())) {
          role = "top";
        } else {
          role = "sweep";
        }
        getProductionInfo(face).role = role;
      });

      occIterateEdges(oc, wire, edge => {
        const generatedList = prismAPI.Generated(edge);
        occIterateListOfShape(oc, generatedList, face => {
          console.log(face);
        })
      })

    }

    console.log(wires);

    // const mobject = new MBrepShell(occ2brep(aRes, ctx.occService.occContext));
    return {
      consumed: [],
      created: []
    };

  },
  schema: {
    length: {
      type: 'number',
      defaultValue: 50,
      label: 'length'
    },

    face: {
      type: 'face',
      initializeBySelection: 0
    },

    direction: {
      type: 'direction',
      optional: true
    },

    datumAxisVector: {
      type: 'datumAxis',
      optional: true,
      label: 'datum axis'
    },
    edgeVector: {
      type: 'edge',
      optional: true,
      label: 'edge',
      accept: edge => edge.brepEdge.curve.degree === 1
    },
    sketchSegmentVector: {
      type: 'sketchObject',
      optional: true,
      label: 'sketch segment',
      accept: obj => obj.isSegment
    },
    flip: {
      type: 'boolean',
      defaultValue: false,
    }

  }
}
