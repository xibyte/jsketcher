import {createPreviewer} from './scenePreviewer';
import {ApplicationContext} from "cad/context";

export const BundleName = "@Preview";

export function activate(ctx: ApplicationContext) {
  let previewer = null;
  ctx.wizardService.materializedWorkingRequest$.attach(materializedWorkingRequest => {
    if (!materializedWorkingRequest) {
      previewer = null;
      return;
    }
    const {type, params} = materializedWorkingRequest;
    if (!ctx.wizardService.operation) {
      return;
    }
    const operation = ctx.operationService.get(type);
    if (operation.previewGeomProvider || operation.previewer) {
      if (previewer === null) {
        let newPreviewer;
        try {
          if (operation.previewGeomProvider) {
            newPreviewer = createPreviewer(operation.previewGeomProvider, ctx.services, params);
          } else if (operation.previewer) {
            newPreviewer = operation.previewer(ctx, params, ctx.wizardService.updateParams);
          }
          previewer = newPreviewer;
        } catch (e) {
          console.error(e);
          return;
        }
        ctx.wizardService.addDisposer(() => {
          newPreviewer.dispose();
          previewer = null;
          ctx.services.viewer.requestRender();
        });
      } else {
        try {
          previewer.update(params);
        } catch (e) {
          console.error(e);
        }
      }
      ctx.services.viewer.requestRender();
    }
  });
}