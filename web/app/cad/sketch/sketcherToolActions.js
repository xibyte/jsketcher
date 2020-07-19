import {AddArcTool} from '../../sketcher/tools/arc';
import {AddSegmentTool} from '../../sketcher/tools/segment';
import {FilletTool} from '../../sketcher/tools/fillet';
import {AddCircleDimTool, AddFreeDimTool, AddHorizontalDimTool, AddVerticalDimTool} from '../../sketcher/tools/dim';
import {OffsetTool} from '../../sketcher/tools/offset';
import {EditCircleTool} from '../../sketcher/tools/circle';
import {EllipseTool} from '../../sketcher/tools/ellipse';
import {ReferencePointTool} from '../../sketcher/tools/origin';
import {RectangleTool} from '../../sketcher/tools/rectangle';
import {BezierCurveTool} from '../../sketcher/tools/bezier-curve';

export default [
  {
    id: 'sketchReferencePoint',
    appearance: {
      label: 'reference point',
      info: 'set reference point on sketch',
      symbol: 'O'
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new ReferencePointTool(viewer(services)))
  },
  {
    id: 'sketchPanTool',
    appearance: {
      label: 'pan tool',
      info: 'switch to sketch pan mode',
      cssIcons: ['arrows'],
    },
    invoke: ({services}) => viewer(services).toolManager.releaseControl()
  },
  {
    id: 'sketchAddPoint',
    appearance: {
      label: 'add point',
      info: 'add point on sketch',
      icon32: 'img/dot.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new ReferencePointTool(viewer(services)))
  },
  {
    id: 'sketchAddSegment',
    appearance: {
      label: 'add segment',
      info: 'add segment point on sketch',
      icon32: 'img/line.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new AddSegmentTool(viewer(services), false))
  },
  {
    id: 'sketchAddMultiSegment',
    appearance: {
      label: 'add multi segment',
      info: 'add multi segment point on sketch',
      icon32: 'img/mline.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new AddSegmentTool(viewer(services), true))
  },
  {
    id: 'sketchAddArc',
    appearance: {
      label: 'add arc',
      info: 'add arc on sketch',
      icon32: 'img/arc.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new AddArcTool(viewer(services)))
  },
  {
    id: 'sketchAddCircle',
    appearance: {
      label: 'add circle',
      info: 'add circle on sketch',
      icon32: 'img/circle.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new EditCircleTool(viewer(services)))
  },
  {
    id: 'sketchAddEllipse',
    appearance: {
      label: 'add ellipse',
      info: 'add ellipse on sketch',
      symbol: 'E',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new EllipseTool(viewer(services), false))
  },
  {
    id: 'sketchAddEllipticalArc',
    appearance: {
      label: 'add elliptical arc',
      info: 'add elliptical arc on sketch',
      symbol: 'EA',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new EllipseTool(viewer(services), true))
  },
  {
    id: 'sketchAddCubicBezierSpline',
    appearance: {
      label: 'add cubic bezier spline',
      info: 'add cubic bezier spline on sketch',
      symbol: 'BZ',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new BezierCurveTool(viewer(services)))
  },
  {
    id: 'sketchAddRectangle',
    appearance: {
      label: 'add rectangle',
      info: 'add rectangle',
      symbol: 'R',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new RectangleTool(viewer(services)))
  },
  {
    id: 'sketchOffsetTool',
    appearance: {
      label: 'polygon offset',
      info: 'create offset polygon off of a polygon',
      symbol: 'O',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new OffsetTool(viewer(services)))
  },
  {
    id: 'sketchAddFillet',
    appearance: {
      label: 'add fillet',
      info: 'add fillet between adjacent segments',
      symbol: 'F',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new FilletTool(viewer(services)))
  },
  {
    id: 'sketchAddDim',
    appearance: {
      label: 'add dimension',
      info: 'add free form dimension between two points',
      icon32: 'img/dim.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new AddFreeDimTool(viewer(services), 
      viewer(services).dimLayer))
  },
  {
    id: 'sketchAddHDim',
    appearance: {
      label: 'add horizontal dimension',
      info: 'add horizontal dimension between two points',
      icon32: 'img/hdim.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new AddHorizontalDimTool(viewer(services),
      viewer(services).dimLayer))
  },
  {
    id: 'sketchAddVDim',
    appearance: {
      label: 'add vertical dimension',
      info: 'add vertical dimension between two points',
      icon32: 'img/vdim.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new AddVerticalDimTool(viewer(services),
      viewer(services).dimLayer))
  },
  {
    id: 'sketchCircleDim',
    appearance: {
      label: 'add circle dimension',
      info: 'add circle dimension on a circle or arc',
      icon32: 'img/ddim.png',
    },
    invoke: ({services}) => viewer(services).toolManager.takeControl(new AddCircleDimTool(viewer(services),
      viewer(services).dimLayer))
  }
]


const viewer = services => services.sketcher.inPlaceEditor.viewer;