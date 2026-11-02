import {PROJECTS_PREFIX, SKETCH_SUFFIX} from '../projectBundle';
import {ProjectManager} from './ProjectManager';
import exportTextData from 'gems/exportTextData';
import {SketchFormat_V3} from "sketcher/io";
import {ApplicationContext} from "cad/context";
import {OperationRequest} from "../craft/craftBundle";
import {AssemblyConstraintDefinition} from "cad/assembly/assemblyConstraint";
import {parseMathDefinitions} from 'gems/safeExpression.mjs';

export function activate(ctx: ApplicationContext) {
  let restoringSnapshot = false;
  let snapshotWorkspaceUncertain = false;
  
  function importProjectImpl(getId, onDone) {
    const uploader = document.createElement('input');
    uploader.setAttribute('type', 'file');
    uploader.style.display = 'none';
    
    document.body.appendChild(uploader);
    uploader.click();
    function read() {
      const reader = new FileReader();
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
    const sketchesNamespace = PROJECTS_PREFIX + projectId + SKETCH_SUFFIX;
    ctx.services.storage.set(PROJECTS_PREFIX + projectId, JSON.stringify(bundle.model));
    bundle.sketches.forEach(sketch => ctx.services.storage.set(sketchesNamespace + sketch.id, JSON.stringify(sketch.data)));
  }

  function importProjectAs() {
    function promptId(fileName, bundle) {
      let promptedId = fileName;
      const iof = promptedId.search(/([^/\\]+)$/);
      if (iof !== -1) {
        promptedId = promptedId.substring(iof).replace(/\.json$/, '');
      }

      const projectId = prompt("New Project Name", promptedId);
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

  // A host can persist this snapshot through its own file service. Refuse
  // states the upstream project format cannot faithfully represent: an open
  // sketch, an unfinished operation, or a history pointer away from the tip.
  // This method does not itself save anything outside the current workspace.
  function snapshotCurrentProject(): ModelBundle {
    if (restoringSnapshot || snapshotWorkspaceUncertain) {
      throw new Error('The project restore is incomplete. Close this workspace and try again.');
    }
    if (ctx.services.sketcher.inPlaceEditor.inEditMode) {
      throw new Error('Finish the open sketch before saving the project.');
    }
    if (ctx.wizardService.workingRequest$.value || ctx.craftService.isEditingHistory || ctx.craftService.isProcessing || ctx.craftService.pipelineFailure$.value) {
      throw new Error('Finish the current operation and return to the latest history before saving.');
    }
    const workbench = ctx.workbenchService.currentWorkbench$.value;
    if (ctx.assemblyService.getConstraints().length ||
        (workbench && !workbench.internal && workbench.workbenchId !== ctx.workbenchService.defaultWorkbenchId)) {
      throw new Error('This project uses assembly constraints or a custom workbench that this snapshot does not support yet.');
    }
    if (new URLSearchParams(window.location.search).get('webos') === '1' && parseMathDefinitions(ctx.expressionService.script$.value).errors.length) {
      throw new Error('Fix unsupported or invalid project expressions before saving.');
    }
    ctx.projectService.save();
    const projectId = ctx.projectService.id;
    const data = ctx.services.storage.get(PROJECTS_PREFIX + projectId);
    if (!data) throw new Error('Project data is unavailable.');
    const namespace = PROJECTS_PREFIX + projectId + SKETCH_SUFFIX;
    const sketches = ctx.services.storage.getAllKeysFromNamespace(namespace).sort().map(key => ({
      id: key.substring(namespace.length),
      data: JSON.parse(ctx.services.storage.get(key))
    }));
    if (new URLSearchParams(window.location.search).get('webos') === '1' && sketches.some(sketch => sketch.data.constants !== undefined && parseMathDefinitions(sketch.data.constants).errors.length)) {
      throw new Error('Fix unsupported or invalid sketch constants before saving.');
    }
    const surfacing = ctx.surfacingService && ctx.surfacingService.save();
    return {model: JSON.parse(data), sketches, ...(surfacing ? {surfacing} : {})};
  }

  // Only intended for a new, hidden host-owned volatile workspace. Validation
  // happens before staging anything; the host must keep that window isolated
  // until this promise succeeds, and discard it on failure or cancellation.
  async function restoreSnapshotInEmptyWorkspace(json: string): Promise<void> {
    if (new URLSearchParams(window.location.search).get('webos') !== '1') throw new Error('A temporary workspace is required.');
    if (restoringSnapshot || snapshotWorkspaceUncertain) throw new Error('This workspace cannot accept a project.');
    if (typeof json !== 'string' || new Blob([json]).size > 128 * 1024 * 1024) throw new Error('Project is not valid JSON or exceeds 128 MiB.');
    let bundle: ModelBundle;
    try { bundle = JSON.parse(json); } catch { throw new Error('Project is not valid JSON.'); }
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!object(bundle) || !object(bundle.model) || !Array.isArray(bundle.model.history) ||
        bundle.model.history.length > 10000 || typeof bundle.model.expressions !== 'string' ||
        !Array.isArray(bundle.sketches) || bundle.sketches.length > 10000) throw new Error('Project has an invalid structure.');
    if ((bundle.model.assembly !== undefined && (!Array.isArray(bundle.model.assembly) || bundle.model.assembly.length)) || bundle.model.workbench !== undefined) {
      throw new Error('Projects with assembly constraints or a custom workbench are not supported yet.');
    }
    if (bundle.surfacing !== undefined && (!object(bundle.surfacing) || !object(bundle.surfacing.scene) || !ctx.surfacingService)) throw new Error('Project contains invalid or unsupported surfacing data.');
    if (bundle.surfacing !== undefined) validateSurfacingIds(bundle.surfacing.scene);
    if (parseMathDefinitions(bundle.model.expressions).errors.length) throw new Error('The project contains unsupported or invalid expressions.');
    for (const op of bundle.model.history) {
      if (!object(op) || typeof op.type !== 'string' || !op.type || op.type.length > 256 ||
          !object(op.params) || !Object.prototype.hasOwnProperty.call(ctx.streams.operation.registry.value, op.type) ||
          typeof ctx.operationService.get(op.type).run !== 'function') throw new Error('Project contains an unsupported operation.');
    }
    const ids = new Set<string>();
    for (const sketch of bundle.sketches) {
      if (!object(sketch) || typeof sketch.id !== 'string' || !sketch.id || sketch.id.length > 1024 ||
          // Reject control characters in storage keys intentionally.
          // eslint-disable-next-line no-control-regex
          /[\u0000-\u001f\u007f]/.test(sketch.id) || ids.has(sketch.id) || !object(sketch.data)) throw new Error('Project contains an invalid sketch.');
      if (sketch.data.constants !== undefined && parseMathDefinitions(sketch.data.constants).errors.length) throw new Error('A sketch contains unsupported or invalid constants.');
      ids.add(sketch.id);
    }
    const namespace = ctx.projectService.sketchStorageNamespace;
    if (ctx.craftService.modifications$.value.history.length || ctx.craftService.isProcessing || ctx.craftService.pipelineFailure$.value || ctx.expressionService.script$.value || ctx.assemblyService.getConstraints().length ||
        ctx.services.storage.getAllKeysFromNamespace(namespace).length ||
        ctx.services.sketcher.inPlaceEditor.inEditMode || ctx.wizardService.workingRequest$.value ||
        (ctx.surfacingService && ctx.surfacingService.save())) {
      throw new Error('Open the project in a new, empty workspace.');
    }
    restoringSnapshot = true;
    try {
      importBundle(ctx.projectService.id, bundle);
      ctx.projectService.loadStrict();
      const deadline = Date.now() + 30000;
      // A completed pipeline, failure, or the deadline ends this wait.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (ctx.craftService.pipelineFailure$.value) throw new Error('The project could not be rebuilt.');
        const mods = ctx.craftService.modifications$.value;
        if (mods.history.length === bundle.model.history.length && mods.pointer === mods.history.length - 1 && !ctx.craftService.isProcessing) break;
        if (Date.now() >= deadline) throw new Error('The project rebuild timed out.');
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      if (bundle.surfacing !== undefined) {
        ctx.surfacingService.load(bundle.surfacing);
        const canonical = value => {
          if (Array.isArray(value)) return value.map(canonical);
          if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
          return value;
        };
        const restored = ctx.surfacingService.save();
        // Recreating derived bounding curves consumes IDs. Their counters may
        // advance, but must never go backwards and risk later collisions.
        const expected = JSON.parse(JSON.stringify(bundle.surfacing));
        const actual = JSON.parse(JSON.stringify(restored));
        const counters = expected.scene.idCounters || {};
        const newCounters = actual.scene.idCounters || {};
        for (const key of Object.keys(counters)) {
          if (!Number.isSafeInteger(counters[key]) || counters[key] < 0 ||
              !Number.isSafeInteger(newCounters[key]) || newCounters[key] < counters[key]) {
            throw new Error('Surfacing identifiers did not reconstruct safely.');
          }
        }
        delete expected.scene.idCounters;
        delete actual.scene.idCounters;
        if (JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected))) {
          throw new Error('Surfacing data did not reconstruct completely.');
        }
      }
    } catch (error) {
      snapshotWorkspaceUncertain = true;
      throw error;
    } finally { restoringSnapshot = false; }
  }

  function exportProject(id) {
    const modelData = ctx.services.storage.get(PROJECTS_PREFIX + id);
    if (modelData) {
      let data = '{\n"model":\n' + modelData + ',\n "sketches": [\n';
      const sketchesNamespace = PROJECTS_PREFIX + id + SKETCH_SUFFIX;
      const sketchKeys = ctx.services.storage.getAllKeysFromNamespace(sketchesNamespace);
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
    const data = ctx.services.storage.get(PROJECTS_PREFIX + oldId);
    if (data) {
      ctx.services.storage.set(PROJECTS_PREFIX + newId, data);
      const sketchesNamespace = PROJECTS_PREFIX + oldId + SKETCH_SUFFIX;
      const sketchKeys = ctx.services.storage.getAllKeysFromNamespace(sketchesNamespace);
      sketchKeys.forEach(key => {
        ctx.services.storage.set(PROJECTS_PREFIX + newId + SKETCH_SUFFIX + key.substring(sketchesNamespace.length), ctx.services.storage.get(key));
      });
    }
  }

  function cloneProject(oldProjectId, silent) {
    const newProjectId = prompt("New Project Name", oldProjectId);
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

    const allProjectKeys = ctx.services.storage.getAllKeysFromNamespace(PROJECTS_PREFIX);
    
    const projects = {};  
    
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
    
    for(const key of allProjectKeys) {
      const sketchSuffixIdx = key.indexOf(SKETCH_SUFFIX);
      if (sketchSuffixIdx !== -1) {
        const projectId = key.substring(PROJECTS_PREFIX.length, sketchSuffixIdx);
        const sketchId = key.substring(sketchSuffixIdx + SKETCH_SUFFIX.length);
        getProject(projectId).sketches.push(sketchId);
      } else {
        const projectId = key.substring(PROJECTS_PREFIX.length);
        getProject(projectId)
      }
    }
    return Object.keys(projects).sort().map(key => projects[key]);
  }

  function deleteProjectImpl(projectId) {
    ctx.services.storage.remove(PROJECTS_PREFIX + projectId);
    const sketchesNamespace = PROJECTS_PREFIX + projectId + SKETCH_SUFFIX;
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
    const newProjectId = prompt("New Project Name");
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
    exists, cloneProject, exportProject, importProjectAs, importProject, loadExternalProject,
    snapshotCurrentProject, restoreSnapshotInEmptyWorkspace
  };

  ctx.services.projectManager = ctx.projectManager;
}

// Reject snapshots that could reuse serialized entity IDs after rebuilding.
// Actual geometry and references are also checked by the round-trip below.
function validateSurfacingIds(scene: any) {
  if (!Array.isArray(scene.vertexIds) || !Array.isArray(scene.vertices) ||
      scene.vertexIds.length !== scene.vertices.length || !Array.isArray(scene.patches) ||
      !Array.isArray(scene.groups) || !scene.idCounters || typeof scene.idCounters !== 'object' || Array.isArray(scene.idCounters)) {
    throw new Error('Surfacing identifiers are missing or invalid.');
  }
  const ids = [scene.id, ...scene.vertexIds, ...scene.patches.map(p => p && p.id), ...scene.groups.map(g => g && g.id)];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id)) throw new Error('Surfacing entity IDs must be unique.');
    const match = /^([A-Za-z]+):(0|[1-9][0-9]*)$/.exec(id);
    const n = match && Number(match[2]);
    if (!match || !Number.isSafeInteger(n) || !Number.isSafeInteger(scene.idCounters[match[1]]) || scene.idCounters[match[1]] <= n) {
      throw new Error('Surfacing identifier counter is invalid.');
    }
    seen.add(id);
  }
}

export class ProjectCounters {
  featureId: number = 0;
}

export interface ProjectModel {

  history: OperationRequest[],

  expressions: string

  assembly?: AssemblyConstraintDefinition[];

  workbench?: string,

  counters?: ProjectCounters;
}

export interface ModelBundle {

  model: ProjectModel,

  surfacing?: any;

  sketches: {
    id: string,
    data: SketchFormat_V3
  }[];

}

interface IProjectManager {

  snapshotCurrentProject(): ModelBundle;

  restoreSnapshotInEmptyWorkspace(json: string): Promise<void>;

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

export const BundleName = "@ProjectManager";
