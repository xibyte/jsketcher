import {TOKENS as APP_TABS_TOKENS} from "./appTabsPlugin";
import {contributeComponent} from './components/ContributedComponents';

export function activate({bus, services}) {
  
  services.dom = {
    viewerContainer: document.getElementById('viewer-container'),
    contributeComponent
  };
  
  bus.subscribe(APP_TABS_TOKENS.TABS, ({activeTab}) => {
    if (activeTab === 0) {
      services.viewer.sceneSetup.updateViewportSize();
    }
  });
}

