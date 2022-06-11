import * as sketcher_utils from '../utils/sketcherUtils'
import {genSerpinskiImpl} from '../../../web/app/utils/genSerpinski';
import {distance} from 'math/commons';

export function createSubjectFromInPlaceSketcher(ctx) {
  const sketcherCtx = ctx.services.sketcher.inPlaceEditor.sketcherAppContext;
  if (!sketcherCtx) {
    throw 'not in sketching mode';
  }
  return createSketcherTPI(sketcherCtx);
}

export function createSketcherTPI(context) {

  const viewer = context.viewer;
  viewer.parametricManager.messageSink = msg => console.log(msg);
  
  const addSegment = sketcher_utils.addSegmentInModel.bind(this, context);
  const addArc = sketcher_utils.addArc.bind(this, context);
  const addCircle = sketcher_utils.addCircle.bind(this, context);
  const addEllipse = sketcher_utils.addEllipse.bind(this, context);
  const addEllipticalArc = sketcher_utils.addEllipticalArc.bind(this, context);
  const addBezier = sketcher_utils.addBezier.bind(this, context);
  const move = sketcher_utils.moveInModel.bind(this, context);
  function addRectangle(x0, y0, x1, y1) {
    return [
      addSegment(x0, y0, x1, y0),
      addSegment(x1, y0, x1, y1),
      addSegment(x1, y1, x0, y1),
      addSegment(x0, y1, x0, y0)
    ];
  } 

  function addSerpinski(ax, ay, bx, by, depth) {
    genSerpinskiImpl(viewer, {x: ax, y: ay}, {x: bx, y: by}, depth);
    let jointWidth = distance(ax, ay, bx, by) / (depth + 1) / 2;
    let dx = bx - ax;
    let dy = by - ay;
    let D = Math.sqrt(dx*dx + dy*dy);
    dx /= D;
    dy /= D;
    let ddx = -dy * jointWidth;
    let ddy =  dx * jointWidth;
    genSerpinskiImpl(viewer, {x: bx-ddx, y: by-ddy}, {x: ax-ddx, y: ay-ddy}, depth);
    addSegment(ax, ay, ax-ddx, ay-ddy);
    addSegment(bx, by, bx-ddx, by-ddy);
  }
  
  function addPolygon() {
    let p, q, n = arguments.length;
    for(p = n - 1, q = 0; q < n; p = q++) {
      let [ax, ay] = arguments[p];
      let [bx, by] = arguments[q];
      addSegment(ax, ay, bx, by);
    }
  }
  
  function changeLayer(layerName) {
    viewer.setActiveLayerName(layerName);
  }

  function changeToConstructionLayer() {
    viewer.addingRoleMode = 'construction';
  }

  function changeToDefaultLayer() {
    viewer.addingRoleMode = null;
  }

  function click(modelX, modelY, attrs) {
    let [x, y] = sketcher_utils.modelToScreen(viewer, modelX, modelY);
    sketcher_utils.clickXY(context, x, y, attrs);
  }

  function select(objects, inclusive) {
    context.viewer.select(objects, !inclusive);
  }

  function runAction(id, actionContext) {
    const action = context.actions[id];
    if (!action ) {
      throw `action ${id} doesn't exist`;
    }
    action.invoke(context, actionContext);
  }

  function toModel(x, y) {
    return sketcher_utils.toModel(context, x, y);
  }

  function toScreen(x, y) {
    return sketcher_utils.modelToScreen(context.viewer, x, y);
  }

  return {
    addSegment, addRectangle, addArc, addCircle, addEllipse, addEllipticalArc, addSerpinski, addBezier, addPolygon, 
    move, changeLayer, changeToConstructionLayer, changeToDefaultLayer, toModel, toScreen,
    click, select, runAction,
    viewer
  }
  
}