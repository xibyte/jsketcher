import {setSketchPrecision} from './sketch/sketchReader';
import {runSandbox} from './sandbox';
import {LOG_FLAGS} from './logFlags';

export const STORAGE_GLOBAL_PREFIX = 'TCAD';
export const PROJECTS_PREFIX = `${STORAGE_GLOBAL_PREFIX}.projects.`;
export const SKETCH_SUFFIX = '.sketch.';


export function activate(context) {

  const {streams, services} = context;
  
  const [id, hints] = parseHintsFromLocation();

  processParams(hints, context);

  const sketchNamespace = id + SKETCH_SUFFIX; 
  const sketchStorageNamespace = PROJECTS_PREFIX + sketchNamespace;

  function sketchStorageKey(sketchIdId) {
    return sketchStorageNamespace + sketchIdId;
  }

  function projectStorageKey() {
    return PROJECTS_PREFIX + id;
  }

  function getSketchURL(sketchId) {
    return sketchNamespace + sketchId;
  }
  
  function save() {
    let data = {};
    data.history = streams.craft.modifications.value.history;
    data.expressions = streams.expressions.script.value;
    services.storage.set(projectStorageKey(), JSON.stringify(data));
  }

  function load() {
    try {
      let dataStr = services.storage.get(services.project.projectStorageKey());
      if (dataStr) {
        let data = JSON.parse(dataStr);
        loadData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }


  function loadData(data) {
    if (data.expressions) {
      services.expressions.load(data.expressions);
    }
    if (data.history) {
      services.craft.reset(data.history);
    }
  }

  function empty() {
    loadData({
      history: [],
      expressions: ""
    });
  }

  services.project = {
    id, sketchStorageKey, projectStorageKey, sketchStorageNamespace, getSketchURL, save, load, empty,
    hints
  }
}

function parseHintsFromLocation() {
  let hints = window.location.hash.substring(1);
  if (!hints) {
    hints = window.location.search.substring(1);
  }
  if (!hints) {
    hints = "DEFAULT";
  }
  return parseHints(hints);
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

function processParams(params, context) {
  if (params.sketchPrecision) {
    setSketchPrecision(parseInt(sketchPrecision));
  }  
  if (params.sandbox) {
    setTimeout(() => runSandbox(context));
  }
  
  const LOG_FLAGS_PREFIX = "LOG.";
  Object.keys(params).forEach(key => {
    if (key.startsWith(LOG_FLAGS_PREFIX)) {
      LOG_FLAGS[key.substring(LOG_FLAGS_PREFIX.length)] = true
    }
  })
}
