import {ApplicationContext} from "context";
import {WorkbenchService} from "cad/workbench/workbenchService";


declare module 'context' {
  interface CoreContext {

    workbenchService: WorkbenchService;
  }
}


export const WorkbenchPlugin = {

  activate(ctx: ApplicationContext) {

    ctx.workbenchService = new WorkbenchService(ctx);
  }

}
