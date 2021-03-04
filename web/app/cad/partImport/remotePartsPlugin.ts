import {ApplicationContext, CoreContext} from "context";
import {Repository} from "../repository/repository";
import {IconType} from "react-icons";
import {Emitter, stream} from "lstream";
import {ShowDialogRequest} from "ui/showDialogRequest";
import {CatalogPartChooser} from "./ui/CatalogPartChooser";
import {ImportPartOperation} from "./importPartOperation/importPartOperation";
import {MObject, MObjectIdGenerator} from "../model/mobject";
import {WEB_CAD_ORG_PARTS_REPO, WEB_CAD_ORG_COMMONS_CATALOG} from "./remotePartsConfig";
import {indexById} from "gems/iterables";
import {ModelBundle} from "../projectManager/projectManagerPlugin";
import {PartRepository} from "./partRepository";
import {initProjectService} from "../projectPlugin";
import {activate as activateCraftPlugin} from '../craft/craftPlugin';
import {activate as activateExpressionsPlugin} from '../expressions/expressionsPlugin';
import {activate as activateCadRegistryPlugin} from '../craft/cadRegistryPlugin';
import {activate as activateStoragePlugin} from '../storage/storagePlugin';
import {activate as activateSketchStoragePlugin} from '../sketch/sketchStoragePlugin';
import {ImportStepFromLocalFileOperation, ImportStepOperation} from "./importStepOperation/importStepOperation";

export function activate(ctx: ApplicationContext) {

  ctx.domService.contributeComponent(CatalogPartChooser);

  ctx.operationService.registerOperations([ImportPartOperation, ImportStepOperation, ImportStepFromLocalFileOperation]);

  function loadDefinedCatalogs(): Promise<[CatalogCategory, PartsCatalog][]> {

    return Promise.all(ctx.remotePartsService.partCatalogs.map(descriptor => loadCatalog(descriptor).then(entry => ([entry, descriptor] as [CatalogCategory, PartsCatalog])) ));
  }

  async function resolvePartReference(partRef: string): Promise<MObject[]>  {

    const splitIdx = partRef.indexOf('/');

    if (splitIdx !== -1) {

      const partRepoId = partRef.substring(0, splitIdx);
      const partId = partRef.substring(splitIdx + 1);
      const partRepository = ctx.remotePartsService.partRepositories[partRepoId];
      if (!partRepository) {
        throw "Can't resolve reference to part repository " + partRepoId;
      }
      try {
        const bundle: ModelBundle = await partRepository.readPartResource(partId, 'model.json').then(res => res.json());
        ctx.projectManager.importBundle(partRef, bundle);
      } catch (e) {
        if (!ctx.projectManager.exists(partRef)) {
          throw e;
        }
        console.error(e);
        console.warn('cannot load remote part ' + partRef + ', using cached version');
      }
    }

    // ctx.craftService.pushContext(partRef);
    const projectModel = ctx.projectManager.loadExternalProject(partRef);

    const evalContext: CoreContext = {
      // @ts-ignore add to the core context
      craftEngine: ctx.services.craftEngine,
      actionService: ctx.actionService,
      operationService: ctx.operationService,
      sketchStorageService: undefined,
      storageService: undefined,
      craftService: undefined,
      expressionService: undefined,
      projectService: undefined,

      // @ts-ignore
      services: {
      },
      streams: {}

    };

    initProjectService(evalContext, partRef, {});
    activateStoragePlugin(evalContext);
    activateSketchStoragePlugin(evalContext);
    activateExpressionsPlugin(evalContext);
    activateCraftPlugin(evalContext);
    // @ts-ignore
    activateCadRegistryPlugin(evalContext);
    // initProject(evalContext, partRef, {});

    evalContext.expressionService.load(projectModel.expressions);
    try {
      MObjectIdGenerator.pushContext('');
      await evalContext.craftService.runPipeline(projectModel.history, 0, projectModel.history.length - 1);
    } finally {
      MObjectIdGenerator.popContext();
    }
    const subSetId = MObjectIdGenerator.next(partRef, partRef);
    const models = evalContext.craftService.models$.value;
    models.forEach(model => {
      model.traverse(m => m.id = subSetId + ':' + m.id);
    });
    return models;
  }

  ctx.remotePartsService = {

    choosePartRequest$: stream(),

    partCatalogs: [
      WEB_CAD_ORG_COMMONS_CATALOG
    ],

    partRepositories: indexById([
      WEB_CAD_ORG_PARTS_REPO
    ]),

    resolvePartReference,
    loadDefinedCatalogs

  };
}

function loadCatalog(descriptor: PartsCatalog): Promise<CatalogCategory> {
  return descriptor.repo.get(descriptor.metadataPath)
    .then(r => r.json())
    .then(catalog => catalog as CatalogCategory);
}

export interface PartsCatalog {
  id: string;
  name: string;
  description: string;
  icon: IconType,
  repo: Repository;
  metadataPath: string;
}

export interface CatalogEntry {

  readonly name: string;
  readonly type: string;

}

export interface CatalogPart extends CatalogEntry {
  readonly id: string;
}


export interface CatalogCategory extends CatalogEntry {
  entries: CatalogEntry[];
}

export class RemotePart  {

  readonly id: string;
  readonly name: string;
  readonly partRepo: PartRepository;

  constructor(id: string, name: string, partRepo: PartRepository) {
    this.id = id;
    this.name = name;
    this.partRepo = partRepo;
  }

  readPartResource = (resourceName: string) => {
    return this.partRepo.readPartResource(this.id, resourceName);
  }
}

export interface RemotePartsService {

  choosePartRequest$: Emitter<ShowDialogRequest<void, CatalogPart>>;

  partCatalogs: PartsCatalog[];

  partRepositories: {
    [id: string]: PartRepository
  }

  loadDefinedCatalogs: () => Promise<[CatalogCategory, PartsCatalog][]>

  resolvePartReference(partId: string): Promise<MObject[]>;
}

declare module 'context' {
  interface ApplicationContext {

    remotePartsService: RemotePartsService;
  }
}


