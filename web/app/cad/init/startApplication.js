import Bus from 'bus';
import * as AppTabsPlugin from '../dom/appTabsPlugin';
import * as DomPlugin from '../dom/domPlugin';
import * as PickControlPlugin from '../scene/controls/pickControlPlugin';
import * as ScenePlugin from '../scene/scenePlugin';
import * as SelectionMarkerPlugin from '../scene/selectionMarker/selectionMarkerPlugin';
import * as ActionSystemPlugin from '../actions/actionSystemPlugin';
import * as UiEntryPointsPlugin from '../dom/uiEntryPointsPlugin';
import * as MenuPlugin from '../dom/menu/menuPlugin';
import * as KeyboardPlugin from '../keyboard/keyboardPlugin';
import * as WizardPlugin from '../craft/wizard/wizardPlugin';
import * as OperationPlugin from '../craft/operationPlugin';
import * as CadRegistryPlugin from '../craft/cadRegistryPlugin';
import * as CraftPlugin from '../craft/craftPlugin';
import * as StoragePlugin from '../storagePlugin';
import * as ProjectPlugin from '../projectPlugin';
import * as SketcherPlugin from '../sketch/sketcherPlugin';
import * as tpiPlugin from '../tpiPlugin';


import * as PartModellerPlugin from '../part/partModellerPlugin';

import startReact from "../dom/startReact";

export default function startApplication(callback) {

  let applicationPlugins = [PartModellerPlugin];
  
  let preUIPlugins = [
    ProjectPlugin,
    StoragePlugin,
    AppTabsPlugin,
    ActionSystemPlugin,
    MenuPlugin,
    UiEntryPointsPlugin,
    KeyboardPlugin,
    WizardPlugin,
    OperationPlugin,
    CadRegistryPlugin,
    CraftPlugin,
    SketcherPlugin,
    tpiPlugin
  ];
  
  let plugins = [
    DomPlugin,
    ScenePlugin,
    PickControlPlugin,
    SelectionMarkerPlugin,
    ...applicationPlugins,
  ];

  let context = {
    bus: new Bus(),
    services: {}
  };

  activatePlugins(preUIPlugins, context);

  startReact(context, () => {
    activatePlugins(plugins, context);
    context.services.project.load();
    context.services.viewer.render();
    callback(context);
  });
}

export function activatePlugins(plugins, context) {
  for (let plugin of plugins) {
    plugin.activate(context);
  }
}

