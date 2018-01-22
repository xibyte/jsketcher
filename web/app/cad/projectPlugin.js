
const STORAGE_PREFIX = "TCAD.projects.";


export function activate({services}) {

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
  
  services.project = {
    id, sketchStorageKey, projectStorageKey, sketchStorageNamespace, getSketchURL;
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
