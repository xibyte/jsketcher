import {NoIcon} from "../icons/NoIcon";
import {NOOP} from "gems/func";
import {Arc} from "../shapes/arc";
import {EndPoint} from "../shapes/point";
import {Circle} from "../shapes/circle";
import {NurbsObject} from "../shapes/nurbsObject";
import NurbsCurve from "geom/curves/nurbsCurve";
import {Segment} from "../shapes/segment";

export const GroundObjectsGeneratorSchema = {

  id: 'GroundObjects',
  title: 'Ground Objects',
  description: 'Ground like origin which are always on sketch but not being saved with',
  internal: true,
  icon: NoIcon,
  persistGeneratedObjects: false,


  params: [
  ],

  sourceObjects: () => {
  },

  removeObject(params, generatedObjects, object, destroy, fullDestroy) {
  },

  initiateState: state => {
  },

  generate: (params, state) => {
    const generated = [
      new EndPoint(0, 0, 'ground/ORIGIN')
    ];
    generated.forEach(g => g.freeze());
    return generated;
  },

  regenerate: (params, generatedObjects, viewer, state) => {
  }

};

