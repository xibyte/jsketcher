import SketcherToolActions from './sketcherToolActions';
import SketcherConstrainsActions from './sketcherConstraintsActions';
import SketcherControlActions from './sketcherControlActions';
import {state} from '../../../../modules/lstream';

export default function ({services, streams}) {

  services.action.registerActions(SketcherToolActions);
  services.action.registerActions(SketcherConstrainsActions);
  services.action.registerActions(SketcherControlActions);
  
  streams.ui.toolbars.sketcherGeneral.value = [
    'sketchReferencePoint',
    'sketchPanTool',
    'sketchAddPoint',
    'sketchAddSegment',
    'sketchAddMultiSegment',
    'sketchAddArc',
    'sketchAddCircle',
    'sketchAddEllipse',
    'sketchAddEllipticalArc',
    'sketchAddCubicBezierSpline',
    'sketchAddRectangle',
    'sketchOffsetTool',
    'sketchAddFillet',
    'sketchAddDim',
    'sketchAddHDim',
    'sketchAddVDim',
    'sketchCircleDim',
  ];
  streams.ui.toolbars.sketcherConstraints.value = [
    'sketchConstraint_coincident',
    'sketchConstraint_verticalConstraint',
    'sketchConstraint_horizontalConstraint',
    'sketchConstraint_parallelConstraint',
    'sketchConstraint_perpendicularConstraint',
    'sketchConstraint_P2LDistanceConstraint',
    'sketchConstraint_P2PDistanceConstraint',
    'sketchConstraint_RadiusConstraint',
    'sketchConstraint_EntityEqualityConstraint',
    'sketchConstraint_tangentConstraint',
    'sketchConstraint_lockConstraint',
    'sketchConstraint_pointOnLine',
    'sketchConstraint_pointOnArc',
    'sketchConstraint_pointInMiddle',
    'sketchConstraint_llAngle',
    'sketchConstraint_symmetry',
    'sketchConstraint_mirror',
    'sketchConstraint_lockConvex'
  ];
  streams.ui.toolbars.sketcherControl.value = [
    'sketchSaveAndExit', 'sketchOpenInTab', 'sketchExit'
  ];
}