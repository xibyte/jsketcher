import {ApplicationContext} from "cad/context";
import {WorkbenchService} from "cad/workbench/workbenchService";
import {CurrentWorkbenchIcon} from "cad/workbench/CurrentWorkbenchIcon";
import {Bundle} from "bundler/bundleSystem";

export interface WorkbenchBundleContext {

  workbenchService: WorkbenchService;
}

export const WorkbenchBundle: Bundle<ApplicationContext> = {

  activate(ctx: ApplicationContext) {

    ctx.workbenchService = new WorkbenchService(ctx);

    ctx.services.menu.registerMenus([
      {
        id: 'workbenches',
        label: 'workbenches',
        icon: CurrentWorkbenchIcon,

        info: 'switch workbench',
        actions: () => {
          const workbenches = ctx.workbenchService.workbenches$.value;
          return Object.keys(workbenches).filter(w => w !== 'sketcher').map(w => 'workbench.switch.' + workbenches[w].workbenchId)
        }
      }
    ]);
  },

  BundleName: "@Workbench",

}
