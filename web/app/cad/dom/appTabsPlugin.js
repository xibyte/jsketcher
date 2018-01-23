import {createToken} from 'bus';

export function activate({services, bus}) {
  bus.enableState(TOKENS.TABS, {
    tabs: [],
    activeTab: -1
  });

  let detachedViews = {};
  
  function show(id, label, url) {
    let index = bus.state[TOKENS.TABS].tabs.findIndex(tab => tab.id === id);
    if (index === -1) {
      let detachedView = detachedViews[id];
      if (detachedView !== undefined) {
        if (!detachedView.closed) {
          detachedView.focus();
          return;
        } else {
          delete detachedViews[id];
        }
      }
    }
    bus.updateState(TOKENS.TABS, ({tabs, activeTab}) => {
      if (index === -1) {
        return {
          activeTab: tabs.length,
          tabs: [...tabs, {
            id, label, url 
          }],
        }
      } else {
        return {
          tabs,
          activeTab: index          
        }
      }
    });
  }

  bus.subscribe(TOKENS.DETACH, index => {
    let {id, url} = bus.state[TOKENS.TABS].tabs[index];
    detachedViews[id] = window.open(url, id, "height=900,width=1200")
    bus.updateState(TOKENS.TABS, ({tabs}) => {
      tabs.splice(index, 1);
      return {
        tabs,
        activeTab: -1
      }
    })
  });
  
  services.appTabs = {
    show
  }
}

export const TOKENS = {
  TABS: createToken('appTabs', 'tabs'),
  OPEN: createToken('appTabs', 'open'),
  DETACH: createToken('appTabs', 'detach')
};