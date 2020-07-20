import * as stitching from 'brep/operations/stitching'
import {AbstractSelectionMarker, setFacesColor} from "./abstractSelectionMarker";

export class SelectionMarker extends AbstractSelectionMarker {

  constructor(context, markColor, readOnlyColor, defaultColor) {
    super(context, 'face');
    this.markColor = markColor;
    this.defaultColor = defaultColor;
    this.readOnlyColor = readOnlyColor;
  }

  mark(sceneFace) {
    this.setColor(sceneFace, this.markColor, this.readOnlyColor);
  }

  unMark(sceneFace) {
    this.setColor(sceneFace, this.defaultColor, this.defaultColor);
  }

  setColor(sceneFace, color, groupColor) {
    const group = this.findGroup(sceneFace);
    if (group) {
      for (let i = 0; i < group.length; i++) {
        let face = group[i];
        setFacesColor(face.meshFaces, groupColor);
        face.solid.mesh.geometry.colorsNeedUpdate = true;
      }
    } else {
      setFacesColor(sceneFace.meshFaces, color);
      sceneFace.solid.mesh.geometry.colorsNeedUpdate = true;
    }
  }
  
  findGroup(sceneFace) {
    if (sceneFace.curvedSurfaces) {
      return sceneFace.curvedSurfaces;
    }
    if (sceneFace.brepFace) {
      const stitchedFace = sceneFace.brepFace.data[stitching.FACE_CHUNK];
      if (stitchedFace) {
        return stitchedFace.faces.map(f => f.data['scene.face']);
      }
    }
    return undefined;
  }
}
