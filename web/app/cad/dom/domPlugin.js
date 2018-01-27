import {TOKENS as APP_TABS_TOKENS} from "./appTabsPlugin";

export function activate({bus, services}) {
  services.dom = {
    viewerContainer: document.getElementById('viewer-container')
  };
  
  bus.subscribe(APP_TABS_TOKENS.TABS, ({activeTab}) => {
    if (activeTab === 0) {
      services.viewer.updateViewportSize();
    }
  });
}

