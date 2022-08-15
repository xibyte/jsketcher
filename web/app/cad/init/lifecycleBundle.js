import {state} from 'lstream';

export function activate(ctx) {
  const {streams, services} = ctx;
  const asyncInitializingJobs = new Set();
  const startTime = performance.now();
  streams.lifecycle = {
    appReady: state(false),
    projectLoaded: state(false)
  };
  services.lifecycle = {
    startAsyncInitializingJob : job => {
      if (!streams.lifecycle.projectLoaded.value) {
        asyncInitializingJobs.add(job);
      }
    },
    finishAsyncInitializingJob : job => {
      asyncInitializingJobs.delete(job);
      services.lifecycle.loadProjectRequest();
    },
    loadProjectRequest: () => {
      if (streams.lifecycle.appReady.value && 
        !streams.lifecycle.projectLoaded.value && 
        services.extension.allExtensionsReady() &&
        asyncInitializingJobs.size === 0) {
        
        services.extension.activateAllExtensions();
        ctx.projectService.load();
        const onLoadTime = performance.now();
        console.log("project loaded, took: " + ((onLoadTime - startTime) / 1000).toFixed(2) + ' sec');
        streams.lifecycle.projectLoaded.value = true;
      }
    },
    declareAppReady: () => {
      streams.lifecycle.appReady.value = true;
      services.lifecycle.loadProjectRequest();
    }
  }
}

export const BundleName = "@Lifecycle";
