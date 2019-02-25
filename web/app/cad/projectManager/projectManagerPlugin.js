import {PROJECTS_PREFIX, SKETCH_SUFFIX} from '../projectPlugin';
import {ProjectManager} from './ProjectManager';
import exportTextData from '../../../../modules/gems/exportTextData';

export function activate(ctx) {
  
  function importProjectImpl(getId, onDone) {
    let uploader = document.createElement('input');
    uploader.setAttribute('type', 'file');
    uploader.style.display = 'none';
    
    document.body.appendChild(uploader);
    uploader.click();
    function read() {
      let reader = new FileReader();
      reader.onload = () => {
        try {
          let bundle = JSON.parse(reader.result);

          let projectId = getId(uploader.value, bundle);
          
          if (projectId) {
            let sketchesNamespace = PROJECTS_PREFIX + projectId + SKETCH_SUFFIX;
            ctx.services.storage.set(PROJECTS_PREFIX + projectId, JSON.stringify(bundle.model));
            bundle.sketches.forEach(s => ctx.services.storage.set(sketchesNamespace + s.id, JSON.stringify(s.data)));
            onDone(projectId);
          }
        } finally {
          document.body.removeChild(uploader);
        }
      };
      reader.readAsText(uploader.files[0]);
    }
    uploader.addEventListener('change', read, false);
  }

  function importProjectAs() {
    function promptId(fileName, bundle) {
      let promptedId = fileName;
      let iof = promptedId.search(/([^/\\]+)$/);
      if (iof !== -1) {
        promptedId = promptedId.substring(iof).replace(/\.json$/, '');
      }

      let projectId = prompt("New Project Name", promptedId);
      if (!projectId && !checkExistence(projectId)) {
        return null
      }
      return projectId;
    }
    importProjectImpl(promptId, openProject);
  }
  
  function importProject() {
    if (confirm('Current project will be wiped off and replaced with the being imported one. Continue?')) {
      ctx.services.project.empty();
      importProjectImpl(() => ctx.services.project.id, ctx.services.project.load);  
    }
  }
  
  function exportProject(id) {
    let modelData = ctx.services.storage.get(PROJECTS_PREFIX + id);
    if (modelData) {
      let data = '{\n"model":\n' + modelData + ',\n "sketches": [\n';
      let sketchesNamespace = PROJECTS_PREFIX + id + SKETCH_SUFFIX;
      let sketchKeys = ctx.services.storage.getAllKeysFromNamespace(sketchesNamespace);
      data += sketchKeys.map(key => `{"id":"${key.substring(sketchesNamespace.length)}", "data": ` 
        + ctx.services.storage.get(key) + "}").join('\n,');
      data += '\n]\n}';
      exportTextData(data, id + '.json');
    }
  }

  function checkExistence(projectId) {
    if (exists(projectId)) {
      alert('Project with name ' + projectId + ' already exists');
      return true;
    }
    return false;
  }
  
  function cloneProjectImpl(oldId, newId) {
    if (checkExistence(newId)) {
      return 
    }
    let data = ctx.services.storage.get(PROJECTS_PREFIX + oldId);
    if (data) {
      ctx.services.storage.set(PROJECTS_PREFIX + newId, data);
      let sketchesNamespace = PROJECTS_PREFIX + oldId + SKETCH_SUFFIX;
      let sketchKeys = ctx.services.storage.getAllKeysFromNamespace(sketchesNamespace);
      sketchKeys.forEach(key => {
        ctx.services.storage.set(PROJECTS_PREFIX + newId + SKETCH_SUFFIX + key.substring(sketchesNamespace.length), ctx.services.storage.get(key));
      });
    }
  }

  function cloneProject(oldProjectId, silent) {
    let newProjectId = prompt("New Project Name", oldProjectId);
    if (newProjectId) {
      cloneProjectImpl(oldProjectId, newProjectId);
      if (!silent) {
        openProject(newProjectId);
      }
      return true;
    }
    return false;
  }

  function exists(projectId) {
    return ctx.services.storage.exists(PROJECTS_PREFIX + projectId);
  }
  
  function listProjects() {

    let allProjectKeys = ctx.services.storage.getAllKeysFromNamespace(PROJECTS_PREFIX);
    
    let projects = {};  
    
    function getProject(id) {
      let project = projects[id];
      if (!project) {
        project = {
          id,
          sketches: []
        };
        projects[id] = project;
      }
      return project;
    }
    
    for(let key of allProjectKeys) {
      let sketchSuffixIdx = key.indexOf(SKETCH_SUFFIX);
      if (sketchSuffixIdx !== -1) {
        let projectId = key.substring(PROJECTS_PREFIX.length, sketchSuffixIdx);
        let sketchId = key.substring(sketchSuffixIdx + SKETCH_SUFFIX.length);
        getProject(projectId).sketches.push(sketchId);
      } else {
        let projectId = key.substring(PROJECTS_PREFIX.length);
        getProject(projectId)
      }
    }
    return Object.keys(projects).sort().map(key => projects[key]);
  }

  function deleteProjectImpl(projectId) {
    ctx.services.storage.remove(PROJECTS_PREFIX + projectId);
    let sketchesNamespace = PROJECTS_PREFIX + projectId + SKETCH_SUFFIX;
    ctx.services.storage.getAllKeysFromNamespace(sketchesNamespace).forEach(key => ctx.services.storage.remove(key));
  }
  
  function deleteProject(projectId) {
    if (confirm(`Project ${projectId} will be deleted. Continue?`)) {
      deleteProjectImpl(projectId)
    } 
  }
  
  function renameProject(oldProjectId, silent) {
    if (cloneProject(oldProjectId, silent)) {
      deleteProjectImpl(oldProjectId);
    }
  }

  function newProject() {
    let newProjectId = prompt("New Project Name");
    if (newProjectId) {
      if (checkExistence(newProjectId)) {
        return
      }
      openProject(newProjectId);
    }
  }

  function openProject(projectId) {
    window.open('?' + projectId);
  }

  ctx.services.ui.registerFloatView('ProjectManager', ProjectManager, 'Project Manager', 'database'); 
  
  ctx.services.projectManager = {
    listProjects, openProject, newProject, renameProject, deleteProject, 
    exists, cloneProject, exportProject, importProjectAs, importProject 
  }
}