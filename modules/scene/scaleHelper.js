import {Object3D, Vector3} from 'three';
import DPR from '../dpr';

export function viewScaleFactor(sceneSetup, origin, SIZE_PX, SIZE_MODEL) {
  const container = sceneSetup.container;
  const viewHeight = container.clientHeight;
  const camera = sceneSetup.camera;

  if (camera.isOrthographicCamera) {
    return viewHeight / (camera.top - camera.bottom)  / camera.zoom * 2 * DPR * SIZE_PX / SIZE_MODEL;
  } else {
    const p = new Vector3().copy(origin);
    const cp = new Vector3().copy(camera.position);
    const z = p.sub(cp).length();
    const tanHFov = Math.atan((camera.fov / 2) / 180 * Math.PI);
    const fitUnits = tanHFov * z * 2;

    const modelTakingPart = SIZE_MODEL / fitUnits;
    const modelActualSizePx = viewHeight * modelTakingPart;
    return SIZE_PX / modelActualSizePx;
  }
}

export class ConstantScaleGroup extends Object3D {

  sizePx;
  sizeModel;
  getOrigin;

  constructor(sceneSetup, sizePx, sizeModel, getOrigin) {
    super();
    this.sceneSetup = sceneSetup;
    this.sizePx = sizePx;
    this.sizeModel = sizeModel;
    this.getOrigin = getOrigin;
  }

  updateMatrix() {
    // let {origin: o, x, y, z} = this.csys;
    //
    const k = viewScaleFactor(this.sceneSetup, this.getOrigin(), this.sizePx, this.sizeModel);

    this.scale.set(k,k,k);
    super.updateMatrix();
  }

}