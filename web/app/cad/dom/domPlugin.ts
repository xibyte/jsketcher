import {contributeComponent} from './components/ContributedComponents';
import {Plugin} from "plugable/pluginSystem";
import {AppTabsService} from "cad/dom/appTabsPlugin";

export interface DomService {

  viewerContainer: HTMLElement,

  contributeComponent: (comp: () => JSX.Element) => void

}

export interface DomInputContext {
  appTabsService: AppTabsService;
  services: any;
}

export interface DomOutputContext {
  domService: DomService;
}

export type DomContext = DomInputContext&DomOutputContext;

declare module 'context' {
  interface ApplicationContext extends DomOutputContext {}
}


export const DomPlugin: Plugin<DomInputContext, DomOutputContext, DomContext> = {

  inputContextSpec: {
    appTabsService: 'required',
    services: 'required',
  },

  outputContextSpec: {
    domService: 'required',
  },

  activate(ctx: DomInputContext&DomOutputContext) {
    ctx.domService = {
      viewerContainer: document.getElementById('viewer-container'),
      contributeComponent
    };

    ctx.services.dom = ctx.domService;

    ctx.appTabsService.tabs$.attach(({activeTab}) => {
      if (activeTab === 0) {
        ctx.services.viewer.sceneSetup.updateViewportSize();
      }
    });
  },

}


