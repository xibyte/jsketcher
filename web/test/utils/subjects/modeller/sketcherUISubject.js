import * as sketcher_utils from '../../../utils/sketcher-utils'
import {decapitalize} from '../../../../../modules/gems/capitalize';
import genSerpinski, {genSerpinskiImpl} from '../../../../app/utils/genSerpinski';
import {distance, distanceAB} from '../../../../app/math/math';

export function createSubjectFromInPlaceSketcher(ctx) {
  
  let actions = {};
  for (const actionId of Object.keys(ctx.streams.action.state)) {
    if (actionId.startsWith('sketch')) {
      let oldId = decapitalize(actionId.substring(6));
      actions[oldId] = {
        action: () =>  ctx.services.action.run(actionId)
      };
      actions.addBezierCurve = actions.addCubicBezierSpline;
    }
  }
  
  const oldStyleSketcherApp = {
    viewer: ctx.services.sketcher.inPlaceEditor.viewer,
    actions
  };

  const addSegment = sketcher_utils.addSegmentInModel.bind(this, oldStyleSketcherApp);
  const addArc = sketcher_utils.addArc.bind(this, oldStyleSketcherApp);
  const addCircle = sketcher_utils.addCircle.bind(this, oldStyleSketcherApp);
  const addEllipse = sketcher_utils.addEllipse.bind(this, oldStyleSketcherApp);
  const addEllipticalArc = sketcher_utils.addEllipticalArc.bind(this, oldStyleSketcherApp);
  const addBezier = sketcher_utils.addBezier.bind(this, oldStyleSketcherApp);
  const move = sketcher_utils.moveInModel.bind(this, oldStyleSketcherApp);
  function addPolygon(x0, y0, x1, y1) {
    return [
      addSegment(x0, y0, x1, y0),
      addSegment(x1, y0, x1, y1),
      addSegment(x1, y1, x0, y1),
      addSegment(x0, y1, x0, y0)
    ];
  } 

  function addSerpinski([ax, ay], [bx, by], depth) {
    genSerpinskiImpl(ctx.services.sketcher.inPlaceEditor.viewer, {x: ax, y: ay}, {x: bx, y: by}, depth);
    let jointWidth = distance(ax, ay, bx, by) / (depth + 1) / 2;

    let dx = bx - ax;
    let dy = by - ay;
    
    let D = Math.sqrt(dx*dx + dy*dy);

    dx /= D;
    dy /= D;

    let ddx = -dy * jointWidth;
    let ddy =  dx * jointWidth;


    genSerpinskiImpl(ctx.services.sketcher.inPlaceEditor.viewer, {x: bx-ddx, y: by-ddy}, {x: ax-ddx, y: ay-ddy}, depth);
    addSegment(ax, ay, ax-ddx, ay-ddy);
    addSegment(bx, by, bx-ddx, by-ddy);
  }
  
  function changeLayer(layerName) {
    ctx.services.sketcher.inPlaceEditor.viewer.setActiveLayerName(layerName);
  }

  function changeToConstructionLayer() {
    changeLayer('_construction_');
  }

  function changeToDefaultLayer() {
    changeLayer('sketch');
  }

  return {
    addSegment, addPolygon, addArc, addCircle, addEllipse, addEllipticalArc, addSerpinski, addBezier, 
    move, changeLayer, changeToConstructionLayer, changeToDefaultLayer, 
  }
  
}