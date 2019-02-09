import * as sketcher_utils from '../../../utils/sketcher-utils'
import {decapitalize} from '../../../../../modules/gems/capitalize';

export function createSubjectFromInPlaceSketcher(ctx) {

  
  let actions = {};
  for (const actionId of Object.keys(ctx.streams.action.state)) {
    if (actionId.startsWith('sketch')) {
      let oldId = decapitalize(actionId.substring(6));
      actions[oldId] = {
        action: () =>  ctx.services.action.run(actionId)
      }      
    }
  }
  
  const oldStyleSketcherApp = {
    viewer: ctx.services.sketcher.inPlaceEditor.viewer,
    actions
  };
  
  return {
    addSegment: sketcher_utils.addSegmentInModel.bind(this, oldStyleSketcherApp)
  }
  
}