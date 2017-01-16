import {sortPolygons, getSketchedPolygons3D} from '../mesh/workbench'



// here will be function of conversion sketch objects to brep DS 

export function ReadSketchFromFace(app, faceId) {
  return getSketchedPolygons3D(app, faceId);
}