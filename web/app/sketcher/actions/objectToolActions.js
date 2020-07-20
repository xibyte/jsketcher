import {RectangleTool} from "../tools/rectangle";
import {
  ArcToolIcon,
  BezierToolIcon,
  CircleToolIcon,
  EllipseArcToolIcon,
  EllipseToolIcon,
  LineToolIcon,
  MultiLineToolIcon,
  PointToolIcon,
  RectangleToolIcon
} from "../icons/tools/ToolIcons";
import {AddSegmentTool} from "../tools/segment";
import {BezierCurveTool} from "../tools/bezier-curve";
import {EllipseTool} from "../tools/ellipse";
import {AddPointTool} from "../tools/point";
import {AddArcTool} from "../tools/arc";
import {EditCircleTool} from "../tools/circle";

export default [

  {
    id: 'PointTool',
    shortName: 'Point',
    kind: 'Tool',
    description: 'Add a point',
    icon: PointToolIcon,
    command: 'geom.point',
    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new AddPointTool(ctx.viewer));

    }

  },


  {
    id: 'SegmentTool',
    shortName: 'Segment',
    kind: 'Tool',
    description: 'Add a segment',
    icon: LineToolIcon,
    command: 'line',

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new AddSegmentTool(ctx.viewer, false));

    },
  },

  {
    id: 'MultiLineTool',
    shortName: 'Multi Line',
    kind: 'Tool',
    description: 'Multi line',
    icon: MultiLineToolIcon,
    command: 'mline',

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new AddSegmentTool(ctx.viewer, true));

    }

  },

  {
    id: 'CircleTool',
    shortName: 'Circle',
    kind: 'Tool',
    description: 'Add a circle',
    icon: CircleToolIcon,
    command: 'circle',

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new EditCircleTool(ctx.viewer));
    }

  },

  {
    id: 'ArcTool',
    shortName: 'Arc',
    kind: 'Tool',
    description: 'Add an arc',
    icon: ArcToolIcon,
    command: 'arc',

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new AddArcTool(ctx.viewer));
    }

  },

  {
    id: 'EllipseTool',
    shortName: 'Ellipse',
    kind: 'Tool',
    description: 'Add an ellipse',
    icon: EllipseToolIcon,

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new EllipseTool(ctx.viewer, false));
    }

  },

  {
    id: 'EllipseArcTool',
    shortName: 'Elliptical Arc',
    kind: 'Tool',
    description: 'Add elliptical arc',
    icon: EllipseArcToolIcon,

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new EllipseTool(ctx.viewer, true));
    }

  },

  {
    id: 'BezierTool',
    shortName: 'Bezier',
    kind: 'Tool',
    description: 'Add a bezier curve',
    icon: BezierToolIcon,

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new BezierCurveTool(ctx.viewer));
    }

  },

  {
    id: 'RectangleTool',
    shortName: 'Rectangle',
    kind: 'Tool',
    description: 'Creates rectangle',
    icon: RectangleToolIcon,
    command: 'rect',

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new RectangleTool(ctx.viewer));
    }

  },
];

