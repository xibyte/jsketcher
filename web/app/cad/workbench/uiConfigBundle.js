import {state} from 'lstream';
import CoreActions from '../actions/coreActions';
import HistoryActions from '../actions/historyActions';
import UsabilityActions from '../actions/usabilityActions';
import menuConfig from './menuConfig';
import React from 'react';
import {ScenePanel} from '../craft/ui/ScenePanel';
import OperationHistory from '../craft/ui/OperationHistory';
import Expressions from '../expressions/Expressions';
import {SelectionView} from "../dom/components/SelectionView";
import {GrSelect} from "react-icons/gr";
import {Explorer} from "cad/dom/components/Explorer";
import {ProjectManager} from 'cad/projectManager/ProjectManager';

export const BundleName = "@UIConfig";
export function activate(ctx) {
  const {services, streams} = ctx;
  ctx.actionService.registerActions(CoreActions);
  ctx.actionService.registerActions(HistoryActions);
  ctx.actionService.registerActions(UsabilityActions);
  
  streams.ui.settingsPanelOpen = state(false);
  streams.ui.controlBars.left.value = [];
  streams.ui.controlBars.right.value = [];
  streams.ui.toolbars.headsUpQuickActions.value = [];
  services.menu.registerMenus(menuConfig);
  services.ui.registerFloatView('scene', ScenePanel, 'Scene', 'cubes');
  services.ui.registerFloatView('history', OperationHistory, 'Modifications', 'history');
  services.ui.registerFloatView('projects', ProjectManager, 'Projects', 'folder-open');
}