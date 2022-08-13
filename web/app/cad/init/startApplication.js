import * as LifecyclePlugin from './lifecyclePlugin';
import * as AppTabsPlugin from '../dom/appTabsBundle';
import {DomBundle} from '../dom/domBundle';
import * as PickControlPlugin from '../scene/controls/pickControlPlugin';
import * as MouseEventSystemPlugin from '../scene/controls/mouseEventSystemPlugin';
import * as ScenePlugin from '../scene/sceneBundle';
import * as MarkerPlugin from '../scene/selectionMarker/markerPlugin';
import * as ActionSystemPlugin from '../actions/actionSystemBundle';
import * as UiPlugin from '../dom/uiBundle';
import * as MenuPlugin from '../dom/menu/menuPlugin';
import * as KeyboardPlugin from '../keyboard/keyboardPlugin';
import * as WizardPlugin from '../craft/wizard/wizardBundle';
import {WizardSelectionPlugin} from '../craft/wizard/wizardSelectionPlugin';
import * as PreviewPlugin from '../preview/previewPlugin';
import * as OperationPlugin from '../craft/operationBundle';
import * as ExtensionsPlugin from '../craft/extensionsPlugin';
import * as CadRegistryPlugin from '../craft/cadRegistryBundle';
import * as CraftPlugin from '../craft/craftBundle';
import * as RemotePartsPlugin from '../partImport/remotePartsBundle';
import * as CraftUiPlugin from '../craft/craftUiPlugin';
import * as StoragePlugin from '../storage/storageBundle';
import * as ProjectPlugin from '../projectBundle';
import * as ProjectManagerPlugin from '../projectManager/projectManagerBundle';
import * as SketcherPlugin from '../sketch/sketcherBundle';
import * as SketcherStoragePlugin from '../sketch/sketchStorageBundle';
import * as ExportPlugin from '../exportPlugin';
import * as ExposurePlugin from '../exposure/exposurePlugin';
import {ViewSyncPlugin} from '../scene/viewSyncPlugin';
import * as EntityContextPlugin from '../scene/entityContextBundle';
import * as OCCTPlugin from '../craft/e0/occtBundle';

import context from 'cad/context';

import startReact from "../dom/startReact";
import * as UIConfigPlugin from "../workbench/uiConfigPlugin";
import * as DebugPlugin from "../debugPlugin";
import * as ExpressionsPlugin from "../expressions/expressionsBundle";
import {WorkbenchBundle} from "../workbench/workbenchBundle";
import * as LocationPlugin from "../location/LocationBundle";
import * as AssemblyPlugin from "../assembly/assemblyBundle";
import {WorkbenchesLoaderPlugin} from "cad/workbench/workbenchesLoaderPlugin";
import {BundleSystem} from "bundler/bundleSystem";
import {AttributesBundle} from "cad/attributes/attributesBundle";
import {HighlightBundle} from "cad/scene/highlightBundle";

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
    DomBundle,
    ScenePlugin,
    MouseEventSystemPlugin,
    MarkerPlugin,
    PickControlPlugin,
    EntityContextPlugin,
    WorkbenchesLoaderPlugin,
    WorkbenchBundle,
    SketcherPlugin,
    UIConfigPlugin,
    DebugPlugin,
    LocationPlugin,
    AssemblyPlugin,
    RemotePartsPlugin,
    ViewSyncPlugin,
    WizardSelectionPlugin,
    AttributesBundle,
    HighlightBundle
  ];
  
  let allPlugins = [...preUIPlugins, ...plugins];
  const pluginSystem = new BundleSystem(context);
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
