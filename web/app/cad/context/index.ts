import {ProjectBundleContext} from "cad/projectBundle";
import {ActionSystemBundleContext} from "cad/actions/actionSystemBundle";
import {AssemblyBundleContext} from "cad/assembly/assemblyBundle";
import {AttributesBundleContext} from "cad/attributes/attributesBundle";
import {CadRegistryBundleContext} from "cad/craft/cadRegistryBundle";
import {CraftBundleContext} from "cad/craft/craftBundle";
import {OperationBundleContext} from "cad/craft/operationBundle";
import {OCCBundleContext} from "cad/craft/e0/occtBundle";
import {WizardBundleContext} from "cad/craft/wizard/wizardBundle";
import {AppTabsBundleContext} from "cad/dom/appTabsBundle";
import {DomBundleContext} from "cad/dom/domBundle";
import {UIBundleContext} from "cad/dom/uiBundle";
import {ExpressionBundleContext} from "cad/expressions/expressionsBundle";
import {LocationBundleContext} from "cad/location/LocationBundle";
import {RemotePartsBundleContext} from "cad/partImport/remotePartsBundle";
import {ProjectManagerBundleContext} from "cad/projectManager/projectManagerBundle";
import {EntityContextBundleContext} from "cad/scene/entityContextBundle";
import {HighlightBundleContext} from "cad/scene/highlightBundle";
import {SceneBundleContext} from "cad/scene/sceneBundle";
import {SketcherBundleContext} from "cad/sketch/sketcherBundle";
import {SketchStorageBundleContext} from "cad/sketch/sketchStorageBundle";
import {StorageBundleContext} from "cad/storage/storageBundle";
import {WorkbenchBundleContext} from "cad/workbench/workbenchBundle";
import {LegacyStructureBundleContext} from "cad/context/LegacyStructureBundle";

export interface ApplicationContext extends
  LegacyStructureBundleContext,
  ProjectBundleContext,
  ActionSystemBundleContext,
  AssemblyBundleContext,
  AttributesBundleContext,
  CadRegistryBundleContext,
  CraftBundleContext,
  OperationBundleContext,
  OCCBundleContext,
  WizardBundleContext,
  AppTabsBundleContext,
  DomBundleContext,
  UIBundleContext,
  ExpressionBundleContext,
  LocationBundleContext,
  RemotePartsBundleContext,
  ProjectManagerBundleContext,
  EntityContextBundleContext,
  HighlightBundleContext,
  SceneBundleContext,
  SketcherBundleContext,
  SketchStorageBundleContext,
  StorageBundleContext,
  WorkbenchBundleContext
{}

export default {} as ApplicationContext;

