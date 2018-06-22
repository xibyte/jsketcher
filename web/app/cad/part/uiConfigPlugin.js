import CoreActions from '../actions/coreActions';
import OperationActions from '../actions/operationActions';
import HistoryActions from '../actions/historyActions';
import menuConfig from './menuConfig';

export function activate({bus, services, streams}) {
  streams.ui.controlBars.left.value = ['menu.file', 'menu.craft', 'menu.boolean', 'menu.primitives', 'Donate', 'GitHub'];
  streams.ui.controlBars.right.value = [
    ['Info', {label: null}],
    ['RefreshSketches', {label: null}],
    ['ShowSketches', {label: 'sketches'}], ['DeselectAll', {label: null}], ['ToggleCameraMode', {label: null}]
  ];

  streams.ui.toolbars.left.value = ['PLANE', 'EditFace', 'EXTRUDE', 'CUT', 'REVOLVE'];
  streams.ui.toolbars.leftSecondary.value = ['INTERSECTION', 'DIFFERENCE', 'UNION'];
  streams.ui.toolbars.right.value = ['Save', 'StlExport'];
  
  services.action.registerActions(CoreActions);
  services.action.registerActions(OperationActions);
  services.action.registerActions(HistoryActions);

  services.menu.registerMenus(menuConfig);
}