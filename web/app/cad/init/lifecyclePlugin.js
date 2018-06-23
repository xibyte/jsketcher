import {state} from '../../../../modules/lstream';

export function activate({streams, services}) {
  const startTime = performance.now();
  streams.lifecycle = {
    appReady: state(false),
    projectLoaded: state(false)
  };
  services.lifecycle = {
    loadProjectRequest: () => {
      if (streams.lifecycle.appReady.value && 
        !streams.lifecycle.projectLoaded.value && 
        services.craftEngines.allEnginesReady()) {
        
        services.project.load();
        streams.lifecycle.projectLoaded.value = true;
        const onLoadTime = performance.now();
        console.log("project loaded, took: " + ((onLoadTime - startTime) / 1000).toFixed(2) + ' sec');
      }
    },
    declareAppReady: () => streams.lifecycle.appReady.value = true
  }
}
