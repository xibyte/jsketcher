import {setSketchPrecision} from './sketch/sketchReader';

const STORAGE_PREFIX = "TCAD.projects.";


export function activate({services, bus}) {

  const id = processHints();
  
  const sketchNamespace = id + '.sketch.'; 
  const sketchStorageNamespace = STORAGE_PREFIX + sketchNamespace;

  function sketchStorageKey(faceId) {
    return sketchStorageNamespace + faceId;
  }

  function projectStorageKey() {
    return STORAGE_PREFIX + id;
  }

  function getSketchURL(sketchId) {
    return sketchNamespace + sketchId;
  }
  
  function save() {
    let data = {};
    data.history = bus.state[services.craft.TOKENS.MODIFICATIONS].history;
    services.storage.set(projectStorageKey(), JSON.stringify(data));
  }

  function load() {
    try {
      let data = services.storage.get(services.project.projectStorageKey());
      if (data) {
        let history = JSON.parse(data).history;
        if (history) {
          services.craft.reset(history);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  services.project = {
    id, sketchStorageKey, projectStorageKey, sketchStorageNamespace, getSketchURL, save, load
  }
}

function processHints() {
  let hints = window.location.hash.substring(1);
  if (!hints) {
    hints = window.location.search.substring(1);
  }
  if (!hints) {
    hints = "DEFAULT";
  }
  let [id, params] = parseHints(hints);
  processParams(params);
  return id;
}

function parseHints(hints) {
  let [id, ...paramsArr] = hints.split('&');
  let params = paramsArr.reduce((params, part) => {
    let [key, value] = part.split('=');
    if (key) {
      if (!value) {
        value = true;
      }
      params[key] = value;
    }
    return params;
  }, {});
  return [id, params];
}

function processParams({sketchPrecision}) {
  if (sketchPrecision) {
    setSketchPrecision(parseInt(sketchPrecision));
  }  
}
