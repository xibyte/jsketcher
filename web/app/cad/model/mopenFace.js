import {MShell} from './mshell';
import {MFace} from './mface';

export class MOpenFaceShell extends MShell {
  
  constructor(surface) {
    super();
    this.faces.push(new MFace(this.id + '/SURFACE', this, surface))
  }
  
  get face() {
    return this.faces[0];
  }
  
}
