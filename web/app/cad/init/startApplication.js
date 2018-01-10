import Bus from 'bus';
import * as DomPlugin from '../dom/domPlugin';
import * as PickControlPlugin from '../scene/controls/pickControlPlugin';
import * as ScenePlugin from '../scene/scenePlugin';
import * as SelectionMarkerPlugin from '../scene/selectionMarker/selectionMarkerPlugin';
import * as ActionSystemPlugin from '../actions/actionSystemPlugin';
import * as UiEntryPointsPlugin from '../dom/uiEntryPointsPlugin';
import * as MenuPlugin from '../dom/menu/menuPlugin';
import * as KeyboardPlugin from '../keyboard/keyboardPlugin';

import * as PartModellerPlugin from '../part/partModellerPlugin';

import startReact from "../dom/startReact";

export default function startApplication(callback) {

  let applicationPlugins = [PartModellerPlugin];
  
  let preUIPlugins = [
    ActionSystemPlugin,
    MenuPlugin,
    UiEntryPointsPlugin,
    KeyboardPlugin
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

  startReact(context.bus, () => {
    activatePlugins(plugins, context);
    context.services.viewer.render();
    callback(context);
  });
}

function activatePlugins(plugins, context) {
  for (let plugin of plugins) {
    plugin.activate(context);
  }
}

