import {state, StateStream} from "lstream";
import {ApplicationContext} from "context";

export function activate(ctx: ApplicationContext) {

  const tabs$ = state<AppTabsState>({
    tabs: [] as AppTab[],
    activeTab: -1
  });

  const detachedViews = {};
  
  function show(id, label, url) {
    let index = tabs$.value.tabs.findIndex(tab => tab.id === id);
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
    tabs$.update(({tabs, activeTab}) => {
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

  function detach(index) {
    let {id, url} = tabs$.value.tabs[index];
    detachedViews[id] = window.open(url, id, "height=900,width=1200")
    tabs$.update(({tabs}) => {
      tabs.splice(index, 1);
      return {
        tabs,
        activeTab: -1
      }
    })
  }

  ctx.appTabsService = {
    show, detach, tabs$
  }
}

export interface AppTab {
  id: string;
  label: string;
  url: string;
}

export interface AppTabsState {
  tabs: AppTab[];
  activeTab: number;
}

export interface AppTabsService {

  tabs$: StateStream<AppTabsState>;

  show(id:string, label:string, url:string);

  detach(index: number)
}

declare module 'context' {
  interface ApplicationContext {

    appTabsService: AppTabsService;
  }
}

