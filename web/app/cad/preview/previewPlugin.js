import {createPreviewer} from './scenePreviewer';

export function activate(ctx) {
  let {streams, services} = ctx;
  
  const updateParams = mutator => streams.wizard.workingRequest.mutate(data => mutator(data.params));
  
  let previewContext = {
    operation: null,
    previewer: null
  };

  streams.wizard.workingRequest.attach(({type, params}) => {
    if (!type) {
      if (previewContext.previewer) {
        previewContext.previewer.dispose();
        previewContext.previewer = null;
        previewContext.operation = null;
        ctx.services.viewer.requestRender();
      }
      return;
    }
    if (type !== previewContext.operation) {
      if (previewContext.previewer != null) {
        previewContext.previewer.dispose();
        ctx.services.viewer.requestRender();
        previewContext.previewer = null;
      }
      let operation = services.operation.get(type);

      if (operation.previewGeomProvider) {
        previewContext.previewer = createPreviewer(operation.previewGeomProvider, services, params);
        ctx.services.viewer.requestRender();
      } else if (operation.previewer) {
        previewContext.previewer = operation.previewer(ctx, params, updateParams);
        ctx.services.viewer.requestRender();
      } else {
        previewContext.previewer = null;
      }
      previewContext.operation = type;
    } else {
      if (previewContext.previewer) {
        previewContext.previewer.update(params);
        ctx.services.viewer.requestRender();
      }
    }
  });
}