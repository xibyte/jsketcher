import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MBrepFace, MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import Vector, {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MBrepShell} from "cad/model/mshell";
import BrepCurve from "geom/curves/brepCurve";
import {Plane} from "geom/impl/plane";
import {enclose} from "brep/operations/brep-enclose";
import {Shell} from "brep/topo/shell";


interface ExtrudeParams {
  length: number;
  doubleSided:boolean,
  face: MFace;
  direction?: UnitVector,
  boolean: BooleanDefinition
}

function extrudeShellFromFace(face: MBrepFace, extrusionVector: Vector): Shell {
  const brepFace = face.brepFace;
  const baseCurves: BrepCurve[] = [];

  for (const he of brepFace.outerLoop.halfEdges) {
    baseCurves.push(he.edge.curve);
  }

  const normal = brepFace.surface.normalInMiddle()._normalize();
  const point = brepFace.outerLoop.halfEdges[0].vertexA.point;
  const basePlane = new Plane(normal, normal.dot(point));

  const lidCurves = baseCurves.map(c => c.translate(extrusionVector));
  const lidPlane = basePlane.translate(extrusionVector).invert();

  return enclose(baseCurves, lidCurves, basePlane, lidPlane);
}

function extrudeShellFromSketch(contourCurves: BrepCurve[], extrusionVector: Vector, csys: any): Shell {
  const normal = csys.z;
  const origin = contourCurves[0].startPoint();
  const basePlane = new Plane(normal, normal.dot(origin));

  const lidCurves = contourCurves.map(c => c.translate(extrusionVector));
  const lidPlane = basePlane.translate(extrusionVector).invert();

  return enclose(contourCurves, lidCurves, basePlane, lidPlane);
}

export const ExtrudeOperation: OperationDescriptor<ExtrudeParams> = {
  id: 'EXTRUDE',
  label: 'Extrude',
  dynamicLabel: params => {
    switch (params.boolean?.kind) {
      case 'SUBTRACT': return 'Extrude-Cut';
      case 'INTERSECT': return 'Extrude-Intersect';
      case 'UNION': return 'Extrude-Fuse';
    }
    return null;
  },
  dynamicIcon: params => {
    switch (params.boolean?.kind) {
      case 'SUBTRACT': return 'img/cad/cut';
    }
    return null;
  },
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  path:__dirname,
  paramsInfo: ({length}) => `(${r(length)})`,
  run: (params: ExtrudeParams, ctx: ApplicationContext, rawParams: any) => {

    const face = params.face;

    let dir: UnitVector;
    if (params.direction) {
      dir = params.direction.normalize();
    } else {
      dir = face.normal().normalize();
      if (rawParams.direction?.flip) {
        dir._negate();
      }
    }
    const extrusionVector = dir._multiply(params.length);

    const sketchId = face.id;
    const sketch = ctx.sketchStorageService.readSketch(sketchId);

    if (!sketch) {
      if (face instanceof MBrepFace) {
        const shell = extrudeShellFromFace(face, extrusionVector);
        const toolShell = new MBrepShell(shell);
        return ctx.nativeService.applyBooleanModifier([toolShell], params.boolean, face, []);
      } else {
        throw "can't extrude an empty surface";
      }
    }

    let csys = face.csys;
    if (params.doubleSided) {
      csys = csys.clone();
      csys.origin._minus(extrusionVector);
      extrusionVector._scale(2);
    }

    const contours = sketch.fetchContours();

    const tools: MBrepShell[] = contours.map(contour => {
      const curves3D = contour.transferInCoordinateSystem(csys);
      const shell = extrudeShellFromSketch(curves3D, extrusionVector, csys);
      return new MBrepShell(shell);
    });

    return ctx.nativeService.applyBooleanModifier(tools, params.boolean, face, [face]);

  },

  form: [
    {
      type: 'number',
      label: 'length',
      name: 'length',
      defaultValue: 50,
    },
    {
      type: 'checkbox',
      label: 'Double Sided',
      name: 'doubleSided',
      defaultValue: false,
    },
    {
      type: 'selection',
      name: 'face',
      capture: [EntityKind.FACE],
      label: 'face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'direction',
      name: 'direction',
      label: 'direction',
      optional: true
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],

  defaultActiveField: 'face',

  masking: [
    {
      id: 'CUT',
      label: 'Cut',
      icon: 'img/cad/cut',
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        direction: {
          flip: true
        },
        boolean: {
          kind: 'SUBTRACT'
        }
      }
    }
  ]
}
