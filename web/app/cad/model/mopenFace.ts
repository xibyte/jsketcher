import {MShell} from './mshell';
import {MFace} from './mface';

export class MOpenFaceShell extends MShell {

  private surfacePrototype: any;
  
  constructor(surfacePrototype, csys) {
    super();
    this.surfacePrototype = surfacePrototype;
    this.csys = csys;
    this.faces.push(new MFace(this.id + '/SURFACE', this, 
      surfacePrototype.boundTo([], 100, 100), csys));
  }
  
  get face() {
    return this.faces[0];
  }

  get parent() {
    return null;
  }
}
