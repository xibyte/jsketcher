import {MShell} from './mshell';
import {MFace} from './mface';

export class MOpenFaceShell extends MShell {
  
  constructor(surfacePrototype, csys) {
    super();
    this.surfacePrototype = surfacePrototype;
    this.faces.push(new MFace(this.id + '/SURFACE', this, 
      surfacePrototype.boundTo([], 100, 100), csys));
  }
  
  get face() {
    return this.faces[0];
  }
  
}
