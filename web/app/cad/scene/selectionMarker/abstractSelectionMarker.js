import {findDiff} from 'gems/iterables';
import {entitySelectionToken} from '../controls/pickControlPlugin';

export class AbstractSelectionMarker {

  constructor(context, entity) {
    this.context = context;
    this.entity = entity;
    this.selection = [];
    this.context.streams.selection[entity].attach(this.update);
  }
  
  update = () => {
    let selection = this.context.services.selection[this.entity].objects;
    if (!selection) {
      if (this.selection.length !== 0) {
        for (let obj of this.selection) {
          this.unMark(obj);
        }
        this.selection = [];
      }
      this.context.services.viewer.render();
      return;
    }
    
    let [, toMark, toWithdraw] = findDiff(selection, this.selection);
    for (let obj of toMark) {
      this.selection.push(obj);
      this.mark(obj);
    }

    for (let obj of toWithdraw) {
      this.selection.splice(this.selection.indexOf(obj), 1);
      this.unMark(obj);
    }
    this.context.services.viewer.render();
  };

  mark(obj) {
    throw 'abstract';
  }

  unMark(obj) {
    throw 'abstract';
  }
}

export function setFacesColor(faces, color) {
  for (let face of faces) {
    if (color === null) {
      face.color.set(new THREE.Color());
    } else {
      face.color.set( color );
    }
  }
}
