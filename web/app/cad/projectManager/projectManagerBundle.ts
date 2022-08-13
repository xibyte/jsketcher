import {PROJECTS_PREFIX, SKETCH_SUFFIX} from '../projectBundle';
import {ProjectManager} from './ProjectManager';
import exportTextData from 'gems/exportTextData';
import {SketchFormat_V3} from "sketcher/io";
import {ApplicationContext} from "cad/context";
import {OperationRequest} from "../craft/craftBundle";
import {AssemblyConstraintDefinition} from "cad/assembly/assemblyConstraint";
import {ContextSpec} from "bundler/bundleSystem";

export function activate(ctx: ApplicationContext) {
  
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

          const bundle = JSON.parse(reader.result as string);
          const projectId = getId(uploader.value, bundle);
          
          if (projectId) {
            importBundle(projectId, bundle);
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

  function importBundle(projectId: string, bundle: ModelBundle) {
    let sketchesNamespace = PROJECTS_PREFIX + projectId + SKETCH_SUFFIX;
    ctx.services.storage.set(PROJECTS_PREFIX + projectId, JSON.stringify(bundle.model));
    bundle.sketches.forEach(sketch => ctx.services.storage.set(sketchesNamespace + sketch.id, JSON.stringify(sketch.data)));
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
      ctx.projectService.empty();
      importProjectImpl(() => ctx.projectService.id, ctx.projectService.load);
    }
  }

  function loadExternalProject(projectId: string): ProjectModel {
    const dataStr = ctx.services.storage.get(PROJECTS_PREFIX + projectId);
    return JSON.parse(dataStr) as ProjectModel;
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

  ctx.projectManager = {
    listProjects, openProject, newProject, renameProject, deleteProject, importBundle,
    exists, cloneProject, exportProject, importProjectAs, importProject, loadExternalProject
  };

  ctx.services.projectManager = ctx.projectManager;
}

export interface ProjectModel {

  history: OperationRequest[],

  expressions: string

  assembly?: AssemblyConstraintDefinition[];

  workbench?: string
}

export interface ModelBundle {

  model: ProjectModel,

  sketches: {
    id: string,
    data: SketchFormat_V3
  }[];

}

interface IProjectManager {

  importBundle(projectId: string, dataJson: ModelBundle): void;

  importProjectAs(): void;

  importProject(): void;

  exportProject(id: string): void;

  cloneProject(oldProjectId: string, silent?: boolean): void;

  exists(projectId: string): boolean;

  listProjects(): string[];

  deleteProject(projectId: string): void;

  renameProject(oldProjectId: string, silent: boolean): void

  newProject(): void;

  openProject(projectId: string): void;

  loadExternalProject(projectId: string): ProjectModel;

}

export interface ProjectManagerBundleContext {

  projectManager: IProjectManager;
}

export const outputContextSpec: ContextSpec<ProjectManagerBundleContext> = {
  projectManager: 'required'
}
