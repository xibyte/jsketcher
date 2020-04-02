import {Ellipse} from '../shapes/ellipse'
import {Circle} from '../shapes/circle'
import {EditCircleTool} from './circle'
import {DragTool} from './drag'
import {EllipseTool, STATE_RADIUS} from './ellipse'
import {AngleBetweenDimension} from "../shapes/dim";
import {AddAngleBetweenDimTool} from "./dim";

export function GetShapeEditTool(viewer, obj, alternative) {
  if (obj instanceof Circle && !alternative) {
    const tool = new EditCircleTool(viewer);
    tool.circle = obj;
    return tool;
  } else if (obj instanceof Ellipse && !alternative) {
    // even for an ell-arc we should act as it would be an ellipse to 
    // avoid stabilize constraints added and demoing B point on move
    // so second arg must be FALSE!
    const tool = new EllipseTool(viewer, false);  
    tool.ellipse = obj;
    tool.state = STATE_RADIUS;
    return tool;
  } else if (obj instanceof AngleBetweenDimension && !alternative) {
    const tool = new AddAngleBetweenDimTool(viewer, viewer.dimLayer);
    tool.a = obj.a;
    tool.dim = obj;
    return tool;
  } else {
    return new DragTool(obj, viewer);
  }
}
