import {OperationDescriptor} from "cad/craft/operationBundle";
import {ActionDefinition} from "cad/actions/actionSystemBundle";
import {state} from "lstream";
import {Index} from "gems/indexType";
import {ApplicationContext} from "cad/context";
import {ActionRef} from "cad/dom/uiBundle";
import {IconDeclaration} from "cad/icons/IconDeclaration";

export class WorkbenchService {

  workbenches$ = state<Index<WorkbenchConfig>>({});

  currentWorkbench$ = state<WorkbenchConfig>(null);
  ctx: ApplicationContext;

  constructor(ctx: ApplicationContext) {
    this.ctx = ctx;
    this.currentWorkbench$.attach(workbenchConfig => {
      if (!workbenchConfig) {
        return
      }
      ctx.uiService.streams.toolbars.headsUp.next(workbenchConfig.ui.toolbar);
      const toolbarStyle = workbenchConfig.ui.toolbarStyle || 'large'
      ctx.uiService.streams.toolbars.headsUpShowTitles.next(toolbarStyle === "large");
    });
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

    this.ctx.actionService.registerAction(
      {
        id: 'workbench.switch.' + workbenchConfig.workbenchId,
        appearance: {
          icon: workbenchConfig.icon,
          label: workbenchConfig.workbenchId,
          info: 'switches to ' + workbenchConfig.workbenchId,
        },
        invoke: (ctx) => {
          this.switchWorkbench(workbenchConfig.workbenchId);
        }
      }
    );
  }

  switchWorkbench(workbenchId: string, silent: boolean = false) {
    const workbenchConfig = this.workbenches$.value[workbenchId];
    if (!workbenchConfig) {
      const noWorkbenchMsg = 'nonexistent workbench ' + workbenchId;
      if (silent) {
        console.warn(noWorkbenchMsg);
      } else {
        throw noWorkbenchMsg;
      }
    }
    this.currentWorkbench$.next(workbenchConfig);
  }

  switchToDefaultWorkbench() {
    this.switchWorkbench(this.defaultWorkbenchId);
  }

  get defaultWorkbenchId() {
    return 'modeler';
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
  icon: IconDeclaration
}