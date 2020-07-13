import CSysObject3D from "../craft/datum/csysObject";
import CSys from "math/csys";
import SceneSetUp from "scene/sceneSetup";


export class LocationControl extends CSysObject3D {

  constructor(csys: CSys, sceneSetup: SceneSetUp, arrowParams: any) {
    super(csys, sceneSetup, arrowParams);
  }

}
