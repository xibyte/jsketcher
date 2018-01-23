
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
    let data = services.storage.get(services.project.projectStorageKey());
    if (data) {
      let history = JSON.parse(data).history;
      if (history) {
        services.craft.reset(history);        
      }
    }
  }
  
  services.project = {
    id, sketchStorageKey, projectStorageKey, sketchStorageNamespace, getSketchURL, save, load
  }
}

function processHints() {
  let id = window.location.hash.substring(1);
  if (!id) {
    id = window.location.search.substring(1);
  }
  if (!id) {
    id = "DEFAULT";
  }
  return id;
}
