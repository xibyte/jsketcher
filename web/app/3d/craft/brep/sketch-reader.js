import {sortPolygons, getSketchedPolygons3D} from '../mesh/workbench'



// here will be function of conversion sketch objects to brep DS 

export function ReadSketchFromFace(app, face, reverseGeom) {
  return getSketchedPolygons3D(app, face, reverseGeom);
}