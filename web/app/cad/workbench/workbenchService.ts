import {OperationDescriptor} from "cad/craft/operationPlugin";
import {ActionDefinition} from "cad/actions/actionSystemPlugin";
import {state} from "lstream";
import {Index} from "gems/indexType";
import {ApplicationContext, CoreContext} from "context";
import {ActionRef} from "cad/dom/uiPlugin";

export class WorkbenchService {

  workbenches$ = state<Index<WorkbenchConfig>>({});

  currentWorkbench$ = state<WorkbenchConfig>(null);
  ctx: CoreContext;

  constructor(ctx: ApplicationContext) {
    this.ctx = ctx;
    this.currentWorkbench$.attach(workbenchConfig => {
      if (!workbenchConfig) {
        return
      }
      ctx.uiService.streams.toolbars.headsUp.next(workbenchConfig.ui.toolbar);
      const toolbarStyle = workbenchConfig.ui.toolbarStyle || 'large'
      ctx.uiService.streams.toolbars.headsUpShowTitles.next(toolbarStyle === "large");
    })
  }

  getWorkbenchConfig(workbenchId: string): WorkbenchConfig {
    return this.workbenches$.value[workbenchId];
  }

  registerWorkbench(workbenchConfig: WorkbenchConfig) {
    if (this.getWorkbenchConfig(workbenchConfig.workbenchId)) {
      throw 'workbench already exists: ' + workbenchConfig.workbenchId;
    }
    this.ctx.operationService.registerOperations(workbenchConfig.features)
    this.ctx.actionService.registerActions(workbenchConfig.actions);

    this.workbenches$.update(workbenches => ({
      ...workbenches,
      [workbenchConfig.workbenchId]: workbenchConfig
    }));
  }

  switchWorkbench(workbenchId: string) {
    const workbenchConfig = this.workbenches$.value[workbenchId];
    if (!workbenchConfig) {
      throw 'nonexistent workbench ' + workbenchId;
    }
    this.currentWorkbench$.next(workbenchConfig);
  }

  switchToDefaultWorkbench() {
    this.switchWorkbench('modeler');
  }
}

export interface WorkbenchUIConfig {
  toolbar: ActionRef;
  toolbarStyle?: 'compact' | 'large';
}

export interface WorkbenchConfig {
  workbenchId: string;
  internal?: boolean;
  features: OperationDescriptor<any>[];
  actions: ActionDefinition<any>[];
  ui: WorkbenchUIConfig;
}