import {contributeComponent} from './components/ContributedComponents';
import {Plugin} from "plugable/pluginSystem";
import {AppTabsService} from "cad/dom/appTabsBundle";

export interface DomService {

  viewerContainer: HTMLElement,

  contributeComponent: (comp: () => JSX.Element) => void

  setCursor(cursor: string);

}

interface DomPluginInputContext {
  appTabsService: AppTabsService;
  services: any;
}

export interface DomPluginContext {
  domService: DomService;
}

type DomPluginWorkingContext = DomPluginInputContext&DomPluginContext;

export const DomBundle: Plugin<DomPluginInputContext, DomPluginContext, DomPluginWorkingContext> = {

  inputContextSpec: {
    appTabsService: 'required',
    services: 'required',
  },

  outputContextSpec: {
    domService: 'required',
  },

  activate(ctx: DomPluginInputContext&DomPluginContext) {
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

}


