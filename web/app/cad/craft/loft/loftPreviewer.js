import {createSmoothMeshGeometryFromData} from '../../../../../modules/scene/geoms';

export function loftPreviewGeomProvider(params, services) {

  const tessInfo = services.craftEngine.loft({
    sections: params.sections.map(services.cadRegistry.findLoop),
    preview: true
  });

  console.dir(tessInfo);
  
  return createSmoothMeshGeometryFromData(tessInfo);

}
