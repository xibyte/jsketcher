import {contributeComponent} from './components/ContributedComponents';
import {Bundle} from "bundler/bundleSystem";
import {AppTabsService} from "cad/dom/appTabsBundle";
import {LegacyStructureBundle, LegacyStructureBundleContext} from "cad/context/LegacyStructureBundle";

export interface DomService {

  viewerContainer: HTMLElement,

  contributeComponent: (comp: () => JSX.Element) => void

  setCursor(cursor: string);

}

interface DomBundleActivationContext extends LegacyStructureBundleContext {
  appTabsService: AppTabsService;
}

export interface DomBundleContext {
  domService: DomService;
}

type DomBundleWorkingContext = DomBundleActivationContext&DomBundleContext;


export const DomBundle: Bundle<DomBundleWorkingContext> = {

  activationDependencies: [
    '@AppTabs',
    LegacyStructureBundle.BundleName
  ],

  activate(ctx: DomBundleWorkingContext) {
    ctx.domService = {
      viewerContainer: document.getElementById('viewer-container'),
      contributeComponent,
      setCursor(cursor: string) {
        if (cursor) {
          ctx.domService.viewerContainer.style.cursor = cursor;
        } else {
          ctx.domService.viewerContainer.style.removeProperty('cursor');
        }
      }
    };

    ctx.services.dom = ctx.domService;

    ctx.appTabsService.tabs$.attach(({activeTab}) => {
      if (activeTab === 0) {
        ctx.services.viewer.sceneSetup.updateViewportSize();
      }
    });
  },

  BundleName: "@Dom",

}


