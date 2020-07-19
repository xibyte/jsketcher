import {createSmoothMeshGeometryFromData} from '../../../../../modules/scene/geoms';

export function loftPreviewGeomProvider(params, services) {

  const tessInfo = services.craftEngine.loftPreview({
    sections: params.sections.map(services.cadRegistry.findLoop)
  });

  return createSmoothMeshGeometryFromData(tessInfo);
}
