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
          if (operation.previewGeomProvider) {
            previewer = createPreviewer(operation.previewGeomProvider, services, params);
          } else if (operation.previewer) {
            previewer = operation.previewer(ctx, params, wizCtx.updateParams);
          }
          wizCtx.addDisposer(() => {
            previewer.dispose();
            ctx.services.viewer.requestRender();
          });
        } else {
          previewer.update(params);
        }
        ctx.services.viewer.requestRender();
      });
    }
  });
}