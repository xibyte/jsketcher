import {ProjectBundleContext} from "cad/projectPlugin";
import {ActionSystemPlugin} from "cad/actions/actionSystemPlugin";
import {AssemblyBundleContext} from "cad/assembly/assemblyPlugin";
import {AttributesPluginContext} from "cad/attributes/attributesPlugin";
import {CadRegistryBundleContext} from "cad/craft/cadRegistryPlugin";
import {CraftBundleContext} from "cad/craft/craftPlugin";
import {OperationBundleContext} from "cad/craft/operationPlugin";
import {OCCBundleContext} from "cad/craft/e0/occtPlugin";
import {WizardPluginContext} from "cad/craft/wizard/wizardPlugin";
import {AppTabsBundleContext} from "cad/dom/appTabsPlugin";
import {DomPluginContext} from "cad/dom/domPlugin";
import {UIBundleContext} from "cad/dom/uiPlugin";
import {ExpressionBundleContext} from "cad/expressions/expressionsPlugin";
import {LocationBundleContext} from "cad/location/LocationPlugin";
import {RemotePartsBundleContext} from "cad/partImport/remotePartsPlugin";
import {ProjectManagerBundleContext} from "cad/projectManager/projectManagerPlugin";
import {EntityContextBundleContext} from "cad/scene/entityContextPlugin";
import {HighlightPluginContext} from "cad/scene/highlightPlugin";
import {SceneBundleContext} from "cad/scene/scenePlugin";
import {SketcherBundleContext} from "cad/sketch/sketcherPlugin";
import {SketchStorageBundleContext} from "cad/sketch/sketchStoragePlugin";
import {StorageBundleContext} from "cad/storage/storagePlugin";
import {WorkbenchBundleContext} from "cad/workbench/workbenchPlugin";

export interface LegacyContext {
  services: any,
  streams: any,
}

export interface ApplicationContext extends
  LegacyContext,
  ProjectBundleContext,
  ActionSystemPlugin,
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

