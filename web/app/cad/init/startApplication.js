import * as LifecyclePlugin from './lifecyclePlugin';
import * as AppTabsPlugin from '../dom/appTabsPlugin';
import * as DomPlugin from '../dom/domPlugin';
import * as PickControlPlugin from '../scene/controls/pickControlPlugin';
import * as MouseEventSystemPlugin from '../scene/controls/mouseEventSystemPlugin';
import * as ScenePlugin from '../scene/scenePlugin';
import * as MarkerPlugin from '../scene/selectionMarker/markerPlugin';
import * as ActionSystemPlugin from '../actions/actionSystemPlugin';
import * as UiPlugin from '../dom/uiPlugin';
import * as MenuPlugin from '../dom/menu/menuPlugin';
import * as KeyboardPlugin from '../keyboard/keyboardPlugin';
import * as WizardPlugin from '../craft/wizard/wizardPlugin';
import * as WizardSelectionPlugin from '../craft/wizard/wizardSelectionPlugin';
import * as PreviewPlugin from '../preview/previewPlugin';
import * as OperationPlugin from '../craft/operationPlugin';
import * as ExtensionsPlugin from '../craft/extensionsPlugin';
import * as CadRegistryPlugin from '../craft/cadRegistryPlugin';
import * as CraftPlugin from '../craft/craftPlugin';
import * as RemotePartsPlugin from '../partImport/remotePartsPlugin';
import * as CraftUiPlugin from '../craft/craftUiPlugin';
import * as StoragePlugin from '../storage/storagePlugin';
import * as ProjectPlugin from '../projectPlugin';
import * as ProjectManagerPlugin from '../projectManager/projectManagerPlugin';
import * as SketcherPlugin from '../sketch/sketcherPlugin';
import * as SketcherStoragePlugin from '../sketch/sketchStoragePlugin';
import * as ExportPlugin from '../exportPlugin';
import * as ExposurePlugin from '../exposure/exposurePlugin';
import * as ViewSyncPlugin from '../scene/viewSyncPlugin';
import * as EntityContextPlugin from '../scene/entityContextPlugin';
import * as OCCTPlugin from '../craft/e0/occtPlugin';

import context from 'context';

import startReact from "../dom/startReact";
import * as UIConfigPlugin from "../part/uiConfigPlugin";
import * as DebugPlugin from "../debugPlugin";
import * as ExpressionsPlugin from "../expressions/expressionsPlugin";
import * as PartOperationsPlugin from "../part/partOperationsPlugin";
import * as LocationPlugin from "../location/LocationPlugin";
import * as AssemblyPlugin from "../assembly/assemblyPlugin";

export default function startApplication(callback) {

  let preUIPlugins = [
    LifecyclePlugin,
    ProjectPlugin,
    StoragePlugin,
    AppTabsPlugin,
    ActionSystemPlugin,
    UiPlugin,
    MenuPlugin,
    KeyboardPlugin,
    ExpressionsPlugin,
    OperationPlugin,
    CraftPlugin,
    ExtensionsPlugin,
    SketcherStoragePlugin,
    WizardPlugin,
    PreviewPlugin,
    CraftUiPlugin,
    CadRegistryPlugin,
    ExportPlugin,
    ExposurePlugin,
    OCCTPlugin,
    ProjectManagerPlugin
  ];
  
  let plugins = [
    DomPlugin,
    ScenePlugin,
    MouseEventSystemPlugin,
    MarkerPlugin,
    PickControlPlugin,
    EntityContextPlugin,
    SketcherPlugin,
    UIConfigPlugin,
    DebugPlugin,
    PartOperationsPlugin,
    LocationPlugin,
    AssemblyPlugin,
    RemotePartsPlugin,
    ViewSyncPlugin,
    WizardSelectionPlugin
  ];
  
  let allPlugins = [...preUIPlugins, ...plugins];
  context.services.plugin = createPluginService(allPlugins, context);

  defineStreams(allPlugins, context);
  
  activatePlugins(preUIPlugins, context);

  startReact(context, () => {
    activatePlugins(plugins, context);
    context.services.lifecycle.declareAppReady();
    context.services.viewer.render();
    callback(context);
  });
}

export function defineStreams(plugins, context) {
  for (let plugin of plugins) {
    if (plugin.defineStreams) {
      plugin.defineStreams(context);
    }
  }
}

export function activatePlugins(plugins, context) {
  for (let plugin of plugins) {
    plugin.activate(context);
  }
}

function createPluginService(plugins, context) {
  function disposePlugins() {
    for (let plugin of plugins) {
      if (plugin.dispose) {
        plugin.dispose(context);
      }
    }
  }

  return {
    disposePlugins
  };
}