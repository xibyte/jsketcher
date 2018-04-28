import {STORAGE_GLOBAL_PREFIX} from '../projectPlugin';

const ENGINES_STORAGE_PREFIX = `${STORAGE_GLOBAL_PREFIX}.CraftEngines`;

let engines = [];

export function activate({services}) {
  let enginesStr = services.storage.get(ENGINES_STORAGE_PREFIX);
  if (enginesStr) {
    engines = JSON.parse(enginesStr);
  }
  
  function registerEngine(id, url){
    engines.push({id, url});
    services.storage.set(ENGINES_STORAGE_PREFIX, JSON.stringify(engines));
    startEngine(engines[engines.length - 1]);
  }

  function engineReady(id, handler) {
    let engine = engines.find(e => e.id === id);
    if (!engine) {
      console.warn(`engine "${id}" not registered`);
    } else {
      engine.handler = handler;
      console.info(`engine "${id}" is ready`);
    }
  }
  
  services.craftEngines = {
    registerEngine,
    getRegisteredEngines: () => engines,
    engineReady
  };

  engines.forEach(e => e.handler = NO_OP_HANDLER);
  engines.forEach(startEngine);
}

function startEngine({id, url}) {
  let engineScript = document.createElement('script');
  engineScript.setAttribute('src', url);
  document.head.appendChild(engineScript);
}

const NO_OP_HANDLER = () => null;