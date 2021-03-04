import CoreActions from '../actions/coreActions';
import OperationActions from '../actions/operationActions';
import HistoryActions from '../actions/historyActions';
import UsabilityActions from '../actions/usabilityActions';
import menuConfig from './menuConfig';
import ObjectExplorer from '../craft/ui/ObjectExplorer';
import React from 'react';
import OperationHistory from '../craft/ui/OperationHistory';
import Expressions from '../expressions/Expressions';
import {SelectionView} from "../dom/components/SelectionView";
import {GrSelect} from "react-icons/gr";

export const STANDARD_MODE_HEADS_UP_TOOLBAR = ['DATUM_CREATE', 'PLANE', 'EditFace', 'EXTRUDE', 'CUT', 'REVOLVE', 'LOFT',
  '-', 'FILLET', '-', 'INTERSECTION', 'SUBTRACT', 'UNION', '-', 'IMPORT_PART', "IMPORT_STEP_FILE", "IMPORT_STEP_LOCAL_FILE", 
  "ExportFaceToDXF"];

export function activate({services, streams}) {
  streams.ui.controlBars.left.value = ['menu.file', 'menu.craft', 'menu.boolean', 'menu.primitives', 'menu.views', 'Donate', 'GitHub'];
  streams.ui.controlBars.right.value = [
    ['Info', {label: null}],
    ['RefreshSketches', {label: null}],
    ['ShowSketches', {label: 'sketches'}], ['DeselectAll', {label: null}], ['ToggleCameraMode', {label: null}]
  ];

  streams.ui.toolbars.headsUp.value = STANDARD_MODE_HEADS_UP_TOOLBAR;
  streams.ui.toolbars.headsUpQuickActions.value = ['Save', 'StlExport'];
  
  services.action.registerActions(CoreActions);
  services.action.registerActions(OperationActions);
  services.action.registerActions(HistoryActions);
  services.action.registerActions(UsabilityActions);

  services.menu.registerMenus(menuConfig);

  services.ui.registerFloatView('project', ObjectExplorer, 'Model', 'cubes');
  services.ui.registerFloatView('history', OperationHistory, 'Modifications', 'history');
  services.ui.registerFloatView('expressions', Expressions, 'Expressions', 'percent');
  services.ui.registerFloatView('selection', SelectionView, 'Selection', GrSelect);
}