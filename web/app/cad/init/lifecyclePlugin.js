import {createToken} from '../../../../modules/bus';

export function activate({bus, services}) {
  const startTime = performance.now();
  bus.enableState(APP_READY_TOKEN, false);
  bus.enableState(APP_PROJECT_LOADED, false);
  services.lifecycle = {
    loadProjectRequest: () => {
      if (bus.state[APP_READY_TOKEN] && !bus.state[APP_PROJECT_LOADED] && services.craftEngines.allEnginesReady()) {
        services.project.load();
        bus.dispatch(APP_PROJECT_LOADED, true);
        const onLoadTime = performance.now();
        console.log("project loaded, took: " + ((onLoadTime - startTime) / 1000).toFixed(2) + ' sec');
      }
    }
  }
}

export const APP_READY_TOKEN = createToken('app', 'ready');
export const APP_PROJECT_LOADED = createToken('app', 'projectLoaded');
