import * as LifecycleBundle from './lifecycleBundle';
import * as AppTabsBundle from '../dom/appTabsBundle';
import {DomBundle} from '../dom/domBundle';
import * as PickControlBundle from '../scene/controls/pickControlBundle';
import * as MouseEventSystemBundle from '../scene/controls/mouseEventSystemBundle';
import * as SceneBundle from '../scene/sceneBundle';
import * as MarkerBundle from '../scene/selectionMarker/markerBundle';
import * as ActionSystemBundle from '../actions/actionSystemBundle';
import * as UIBundle from '../dom/uiBundle';
import * as MenuBundle from '../dom/menu/menuBundle';
import * as KeyboardBundle from '../keyboard/keyboardBundle';
import * as WizardBundle from '../craft/wizard/wizardBundle';
import {WizardSelectionBundle} from '../craft/wizard/wizardSelectionBundle';
import * as PreviewBundle from '../preview/previewBundle';
import * as OperationBundle from '../craft/operationBundle';
import * as ExtensionsBundle from '../craft/extensionsBundle';
import * as CadRegistryBundle from '../craft/cadRegistryBundle';
import * as CraftBundle from '../craft/craftBundle';
import * as RemotePartsBundle from '../partImport/remotePartsBundle';
import * as CraftUIBundle from '../craft/craftUIBundle';
import * as StorageBundle from '../storage/storageBundle';
import * as ProjectBundle from '../projectBundle';
import * as ProjectManagerBundle from '../projectManager/projectManagerBundle';
import * as SketcherBundle from '../sketch/sketcherBundle';
import * as SketcherStorageBundle from '../sketch/sketchStorageBundle';
import * as ExportBundle from '../exportBundle';
import * as ExposureBundle from '../exposure/exposureBundle';
import {ViewSyncBundle} from '../scene/viewSyncBundle';
import * as EntityContextPlugin from '../scene/entityContextBundle';
import * as OCCTBundle from '../craft/e0/occtBundle';
import startReact from "../dom/startReact";
import * as UIConfigBundle from "../workbench/uiConfigBundle";
import * as DebugBundle from "../debugBundle";
import * as ExpressionsBundle from "../expressions/expressionsBundle";
import {WorkbenchBundle} from "../workbench/workbenchBundle";
import * as LocationBundle from "../location/LocationBundle";
import * as AssemblyBundle from "../assembly/assemblyBundle";
import {WorkbenchesLoaderBundle} from "cad/workbench/workbenchesLoaderBundle";
import {AttributesBundle} from "cad/attributes/attributesBundle";
import {HighlightBundle} from "cad/scene/highlightBundle";
import {LegacyStructureBundle} from "cad/context/LegacyStructureBundle";
import context from "cad/context";
import {BundleSystem} from "bundler/bundleSystem";

export default function startApplication(callback) {

  const preUIBundles = [
    LifecycleBundle,
    ProjectBundle,
    StorageBundle,
    AppTabsBundle,
    ActionSystemBundle,
    UIBundle,
    MenuBundle,
    KeyboardBundle,
    ExpressionsBundle,
    OperationBundle,
    CraftBundle,
    ExtensionsBundle,
    SketcherStorageBundle,
    WizardBundle,
    PreviewBundle,
    CraftUIBundle,
    CadRegistryBundle,
    ExportBundle,
    ExposureBundle,
    OCCTBundle,
    ProjectManagerBundle
  ];
  
  const bundles = [
    DomBundle,
    SceneBundle,
    MouseEventSystemBundle,
    MarkerBundle,
    PickControlBundle,
    EntityContextPlugin,
    WorkbenchesLoaderBundle,
    WorkbenchBundle,
    SketcherBundle,
    UIConfigBundle,
    DebugBundle,
    LocationBundle,
    AssemblyBundle,
    RemotePartsBundle,
    ViewSyncBundle,
    WizardSelectionBundle,
    AttributesBundle,
    HighlightBundle
  ];
  
  const allBundle = [...preUIBundles, ...bundles];
  const bundleSystem = new BundleSystem(context);

  bundleSystem.activate(LegacyStructureBundle);
  allBundle.forEach(bundle => {
    if (bundle.defineStreams) {
      bundle.defineStreams(context);
    }
  });

  preUIBundles.forEach(bundle => {
    bundleSystem.activate(bundle);
  });

  startReact(context, () => {
    bundles.forEach(bundle => {
      bundleSystem.activate(bundle);
    });
    context.services.lifecycle.declareAppReady();
    context.viewer.render();
    callback(context);
  });

  bundleSystem.checkDanglingBundles();
  bundleSystem.checkPerfectLoad();
}
