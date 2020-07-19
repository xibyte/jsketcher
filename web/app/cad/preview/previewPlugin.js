import {createPreviewer} from './scenePreviewer';

export function activate(ctx) {
  let {streams, services} = ctx;
  
  streams.wizard.wizardContext.attach(wizCtx => {
    if (!wizCtx) {
      return;
    }
    let {operation, materializedWorkingRequest$} = wizCtx; 
    if (operation.previewGeomProvider || operation.previewer) {
      let previewer = null;
      materializedWorkingRequest$.attach(({type, params}) => {
        if (previewer === null) {
          try {
            if (operation.previewGeomProvider) {
              previewer = createPreviewer(operation.previewGeomProvider, services, params);
            } else if (operation.previewer) {
              previewer = operation.previewer(ctx, params, wizCtx.updateParams);
            }
          } catch (e) {
            console.error(e);
            return;
          }
          wizCtx.addDisposer(() => {
            previewer.dispose();
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
      });
    }
  });
}