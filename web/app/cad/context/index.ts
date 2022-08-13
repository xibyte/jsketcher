import {ProjectBundleContext} from "cad/projectBundle";
import {ActionSystemBundle} from "cad/actions/actionSystemBundle";
import {AssemblyBundleContext} from "cad/assembly/assemblyBundle";
import {AttributesPluginContext} from "cad/attributes/attributesBundle";
import {CadRegistryBundleContext} from "cad/craft/cadRegistryBundle";
import {CraftBundleContext} from "cad/craft/craftBundle";
import {OperationBundleContext} from "cad/craft/operationBundle";
import {OCCBundleContext} from "cad/craft/e0/occtBundle";
import {WizardPluginContext} from "cad/craft/wizard/wizardBundle";
import {AppTabsBundleContext} from "cad/dom/appTabsBundle";
import {DomPluginContext} from "cad/dom/domBundle";
import {UIBundleContext} from "cad/dom/uiBundle";
import {ExpressionBundleContext} from "cad/expressions/expressionsBundle";
import {LocationBundleContext} from "cad/location/LocationBundle";
import {RemotePartsBundleContext} from "cad/partImport/remotePartsBundle";
import {ProjectManagerBundleContext} from "cad/projectManager/projectManagerBundle";
import {EntityContextBundleContext} from "cad/scene/entityContextBundle";
import {HighlightPluginContext} from "cad/scene/highlightBundle";
import {SceneBundleContext} from "cad/scene/sceneBundle";
import {SketcherBundleContext} from "cad/sketch/sketcherBundle";
import {SketchStorageBundleContext} from "cad/sketch/sketchStorageBundle";
import {StorageBundleContext} from "cad/storage/storageBundle";
import {WorkbenchBundleContext} from "cad/workbench/workbenchBundle";

export interface LegacyContext {
  services: any,
  streams: any,
}

export interface ApplicationContext extends
  LegacyContext,
  ProjectBundleContext,
  ActionSystemBundle,
  AssemblyBundleContext,
  AttributesPluginContext,
  CadRegistryBundleContext,
  CraftBundleContext,
  OperationBundleContext,
  OCCBundleContext,
  WizardPluginContext,
  AppTabsBundleContext,
  DomPluginContext,
  UIBundleContext,
  ExpressionBundleContext,
  LocationBundleContext,
  RemotePartsBundleContext,
  ProjectManagerBundleContext,
  EntityContextBundleContext,
  HighlightPluginContext,
  SceneBundleContext,
  SketcherBundleContext,
  SketchStorageBundleContext,
  StorageBundleContext,
  WorkbenchBundleContext
{}

export type CoreContext = ApplicationContext;

export default {

  services: {},
  streams: {}

} as ApplicationContext;

