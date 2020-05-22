import {ApplicationContext} from "context";
import {Repository} from "../repository/repository";
import {IconType} from "react-icons";
import {WEB_CAD_ORG_COMMONS} from "./partCatalogConfig";
import {Emitter, stream} from "lstream";
import {ShowDialogRequest} from "ui/showDialogRequest";
import {CatalogPartChooser} from "./ui/CatalogPartChooser";
import {GrCloudDownload} from "react-icons/gr";

export function activate(ctx: ApplicationContext) {

  ctx.domService.contributeComponent(CatalogPartChooser);

  ctx.actionService.registerAction({
    id: 'IMPORT_PART',
    appearance: {
      info: 'opens a dialog to import parts from the catalog',
      label: 'import part',
      icon: GrCloudDownload
    },
    invoke: (ctx: ApplicationContext) => {
      ctx.partImportService.choosePartRequest$.next({
        centerScreen: true,
        onDone: () => {}
      })
    },
  });

  function loadDefinedCatalogs(): Promise<[CatalogCategory, PartsCatalog][]> {

    return Promise.all(ctx.partImportService.partCatalogs.map(descriptor => loadCatalog(descriptor).then(entry => ([entry, descriptor] as [CatalogCategory, PartsCatalog])) ));
  }

  ctx.partImportService = {

    choosePartRequest$: stream(),

    partCatalogs: [
      WEB_CAD_ORG_COMMONS
    ],

    readPartResource,

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
  partsPath: string;
  metadataPath: string;
}

function readPartResource(catalog: PartsCatalog, partId: string, resourceName: string): Promise<Response> {
  return catalog.repo.get(catalog.partsPath + '/' + partId + '/' + resourceName);
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

export interface PartImportService {

  choosePartRequest$: Emitter<ShowDialogRequest<void, CatalogPart>>;

  partCatalogs: PartsCatalog[];

  readPartResource: (catalog: PartsCatalog, partId: string, resourceName: string) => Promise<Response>;

  loadDefinedCatalogs: () => Promise<[CatalogCategory, PartsCatalog][]>
}

declare module 'context' {
  interface ApplicationContext {

    partImportService: PartImportService;
  }
}

