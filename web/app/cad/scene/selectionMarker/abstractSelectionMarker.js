import {findDiff} from 'gems/iterables';

export class AbstractSelectionMarker {

  constructor(bus, event) {
    this.bus = bus;
    this.selection = [];
    this.bus.subscribe(event, this.update);
  }
  
  update = selection => {
    if (!selection) {
      if (this.selection.length !== 0) {
        for (let obj of this.selection) {
          this.unMark(obj);
        }
        this.selection = [];
      }
      this.bus.dispatch('scene:update');
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
    this.bus.dispatch('scene:update');
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
