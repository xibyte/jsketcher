import CoreActions from '../actions/coreActions';
import OperationActions from '../actions/operationActions';
import HistoryActions from '../actions/historyActions';
import {TOKENS as UI_TOKENS} from '../dom/uiEntryPointsPlugin';
import menuConfig from "./menuConfig";

export function activate({bus, services}) {

  services.action.registerActions(CoreActions);
  services.action.registerActions(OperationActions);
  services.action.registerActions(HistoryActions);

  services.menu.registerMenus(menuConfig);
  
  bus.dispatch(UI_TOKENS.CONTROL_BAR_LEFT, ['menu.file', 'menu.craft', 'menu.boolean', 'menu.primitives', 'Donate', 'GitHub']);
  bus.dispatch(UI_TOKENS.CONTROL_BAR_RIGHT, [
    ['Info', {label: null}],
    ['RefreshSketches', {label: null}],
    ['ShowSketches', {label: 'sketches'}], ['DeselectAll', {label: null}], ['ToggleCameraMode', {label: null}]
  ]);

  bus.dispatch(UI_TOKENS.TOOLBAR_BAR_LEFT, ['PLANE', 'EditFace', 'EXTRUDE', 'CUT', 'REVOLVE']);
  bus.dispatch(UI_TOKENS.TOOLBAR_BAR_LEFT_SECONDARY, ['INTERSECTION', 'DIFFERENCE', 'UNION']);
  bus.dispatch(UI_TOKENS.TOOLBAR_BAR_RIGHT, ['Save', 'StlExport']);
}