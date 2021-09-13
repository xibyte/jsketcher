import { ApplicationContext } from "context";
import {initOpenCascade} from "opencascade.js";

export function activate(ctx: ApplicationContext) {
    ctx.services.lifecycle.startAsyncInitializingJob('occ:loader');
    ctx.occService = new OCCService();
    initOpenCascade().then(openCascade => {
        ctx.occService.occContext = openCascade;
        ctx.services.lifecycle.finishAsyncInitializingJob('occ:loader');
    });
}

export type OCCContext = any;

export class OCCService {

    occContext: OCCContext;

}

declare module 'context' {

    interface ApplicationContext {
  
      occService: OCCService;
    }
  }
  
