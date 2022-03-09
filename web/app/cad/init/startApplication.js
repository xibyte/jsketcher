import * as LifecyclePlugin from './lifecyclePlugin';
import * as AppTabsPlugin from '../dom/appTabsPlugin';
import {DomPlugin} from '../dom/domPlugin';
import * as PickControlPlugin from '../scene/controls/pickControlPlugin';
import * as MouseEventSystemPlugin from '../scene/controls/mouseEventSystemPlugin';
import * as ScenePlugin from '../scene/scenePlugin';
import * as MarkerPlugin from '../scene/selectionMarker/markerPlugin';
import * as ActionSystemPlugin from '../actions/actionSystemPlugin';
import * as UiPlugin from '../dom/uiPlugin';
import * as MenuPlugin from '../dom/menu/menuPlugin';
import * as KeyboardPlugin from '../keyboard/keyboardPlugin';
import * as WizardPlugin from '../craft/wizard/wizardPlugin';
import {WizardSelectionPlugin} from '../craft/wizard/wizardSelectionPlugin';
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
import * as UIConfigPlugin from "../workbench/uiConfigPlugin";
import * as DebugPlugin from "../debugPlugin";
import * as ExpressionsPlugin from "../expressions/expressionsPlugin";
import {WorkbenchPlugin} from "../workbench/workbenchPlugin";
import * as LocationPlugin from "../location/LocationPlugin";
import * as AssemblyPlugin from "../assembly/assemblyPlugin";
import {WorkbenchesLoaderPlugin} from "cad/workbench/workbenchesLoaderPlugin";
import {PluginSystem} from "plugable/pluginSystem";
import {AttributesPlugin} from "cad/attributes/attributesPlugin";

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
    WorkbenchesLoaderPlugin,
    WorkbenchPlugin,
    SketcherPlugin,
    UIConfigPlugin,
    DebugPlugin,
    LocationPlugin,
    AssemblyPlugin,
    RemotePartsPlugin,
    ViewSyncPlugin,
    WizardSelectionPlugin,
    AttributesPlugin
  ];
  
  let allPlugins = [...preUIPlugins, ...plugins];
  const pluginSystem = new PluginSystem(context);
  context.pluginSystem = pluginSystem;

  defineStreams(allPlugins, context);
  
  activatePlugins(preUIPlugins, pluginSystem);

  startReact(context, () => {
    activatePlugins(plugins, pluginSystem);
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

function adapter(oldStylePlugin) {

  if (oldStylePlugin.inputContextSpec) {
    return oldStylePlugin;
  }

  return {

    inputContextSpec: {},

    outputContextSpec: {},

    activate: oldStylePlugin.activate,

    deactivate: ctx => {}

  }

}

export function activatePlugins(plugins, pluginSystem) {
  for (let plugin of plugins) {
    pluginSystem.load(adapter(plugin));
  }
}
