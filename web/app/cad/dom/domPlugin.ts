import {contributeComponent} from './components/ContributedComponents';

export function activate(ctx) {

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
}

export interface DomService {

  viewerContainer: HTMLElement,

  contributeComponent: (comp: () => JSX.Element) => void

}

declare module 'context' {

  interface ApplicationContext {

    domService: DomService;
  }
}


