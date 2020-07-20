import {NoIcon} from "../icons/NoIcon";
import {Arc} from "../shapes/arc";
import {Circle} from "../shapes/circle";
import {NurbsObject} from "../shapes/nurbsObject";
import NurbsCurve from "geom/curves/nurbsCurve";
import {Segment} from "../shapes/segment";

export const BoundaryGeneratorSchema = {

  id: 'Boundary',
  title: 'Boundary',
  description: 'Generates object comming as a boundary data from the part editor',
  internal: true,
  icon: NoIcon,
  persistGeneratedObjects: false,

  params: [
    {
      name: 'boundaryData',
      label: 'Boundary Data',
      type: 'object'
    },
  ],

  sourceObjects: () => {
  },

  removeObject(params, generatedObjects, object, destroy, fullDestroy) {
  },

  initiateState: state => {
  },

  generate: (params, state) => {

    const {boundaryData: boundary} = params;

    const out = [];

    let i, obj;
    function process(obj) {
      obj.freeze();
      out.push(obj);
    }

    for (i = 0; i < boundary.lines.length; ++i) {
      let edge = boundary.lines[i];
      let seg = new Segment(edge.a.x, edge.a.y, edge.b.x, edge.b.y,'boundary/' + edge.id);
      process(seg);
    }
    for (i = 0; i < boundary.arcs.length; ++i) {
      const a = boundary.arcs[i];
      const arc = new Arc(
        a.a.x, a.a.y,
        a.b.x, a.b.y,
        a.c.x, a.c.y,
        'boundary/' + a.id
      );
      process(arc);
    }
    for (i = 0; i < boundary.circles.length; ++i) {
      obj = boundary.circles[i];
      const circle = new Circle(obj.c.x, obj.c.y, 'boundary/' + obj.id);
      circle.r.set(obj.r);
      process(circle);
    }
    for (i = 0; i < boundary.nurbses.length; ++i) {
      let nurbsData = boundary.nurbses[i];
      let nurbs = new NurbsObject(NurbsCurve.deserialize(nurbsData), 'boundary/' + nurbsData.id);
      process(nurbs);
    }

    return out;
  },

  regenerate: (params, generatedObjects, viewer, state) => {
  }

};

