import {contributeComponent} from './components/ContributedComponents';

export function activate(ctx) {

  ctx.services.dom = {
    viewerContainer: document.getElementById('viewer-container'),
    contributeComponent
  };

  ctx.appTabsService.tabs$.attach(({activeTab}) => {
    if (activeTab === 0) {
      services.viewer.sceneSetup.updateViewportSize();
    }
  });
}

