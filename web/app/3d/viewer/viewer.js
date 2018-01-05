import {AXIS} from '../../math/l3space'
import DPR from 'dpr'
import * as mask from '../../utils/mask';
import {EdgeSelectionManager, SelectionManager, SketchSelectionManager} from '../selection'
import {createArrow} from 'scene/objects/auxiliary';
import Vector from 'math/vector';
import {OnTopOfAll} from 'scene/materialMixins';
import SceneSetup from 'scene/sceneSetup';
import * as SceneGraph from 'scene/sceneGraph';
import {moveObject3D, setBasisToObject3D} from 'scene/objects/transform';
import {initPickControl} from "./pickControl";

export class Viewer {
  
  constructor(bus, container) {
    this.bus = bus;
    this.sceneSetup = new SceneSetup(container);
    initPickControl(this.sceneSetup.domElement(), this.onPick);

    this.workGroup = SceneGraph.createGroup();
    this.auxGroup = SceneGraph.createGroup();
    SceneGraph.addToGroup(this.sceneSetup.rootGroup, this.workGroup);
    SceneGraph.addToGroup(this.sceneSetup.rootGroup, this.auxGroup);

    this.setUpAxises();
    this.setUpBasisGroup();
    this.setUpSelectionManager();

    this.render();
  }
  
  render() {
    this.sceneSetup.render();  
  }

  setUpAxises() {
    let arrowLength = 1500;
    let createAxisArrow = createArrow.bind(null, arrowLength, 40, 16);
    let addAxis = (axis, color) => {
      let arrow = createAxisArrow(axis, color, 0.2);
      moveObject3D(arrow, axis.scale(-arrowLength * 0.5));
      SceneGraph.addToGroup(this.auxGroup, arrow);
    };

    addAxis(AXIS.X, 0xFF0000);
    addAxis(AXIS.Y, 0x00FF00);
    addAxis(AXIS.Z, 0x0000FF);
  }

  setUpSelectionManager() {
    this.selectionMgr = new SelectionManager(this, 0xFAFAD2, 0xFF0000, null);
    this.sketchSelectionMgr = new SketchSelectionManager(this, new THREE.LineBasicMaterial({
      color: 0xFF0000,
      linewidth: 6 / DPR
    }));
    this.edgeSelectionMgr = new EdgeSelectionManager(this, new THREE.LineBasicMaterial({
      color: 0xFA8072,
      linewidth: 12 / DPR
    }));
  }

  setUpBasisGroup() {
    let length = 200;
    let arrowLength = length * 0.2;
    let arrowHead = arrowLength * 0.4;

    let _createArrow = createArrow.bind(null, length, arrowLength, arrowHead);

    function createBasisArrow(axis, color) {
      return _createArrow(axis, color, 0.4, [OnTopOfAll]);
    }

    this.basisGroup = SceneGraph.createGroup();
    let xAxis = createBasisArrow(new Vector(1, 0, 0), 0xFF0000);
    let yAxis = createBasisArrow(new Vector(0, 1, 0), 0x00FF00);
    SceneGraph.addToGroup(this.basisGroup, xAxis);
    SceneGraph.addToGroup(this.basisGroup, yAxis);
  }

  updateBasis(basis, depth) {
    setBasisToObject3D(this.basisGroup, basis, depth);
  }

  showBasis() {
    this.workGroup.add(this.basisGroup);
  }

  hideBasis() {
    if (this.basisGroup.parent !== null) {
      this.basisGroup.parent.remove(this.basisGroup);
    }
  }

  lookAt(obj) {
    this.sceneSetup.lookAt(obj);
    this.render();
  }

  onPick = e => {
    if (e.button !== 0) {
      this.handleSolidPick(e);
    } else {
      this.handlePick(e);
    }
  };
  
  handlePick(event) {
    this.raycastObjects(event, PICK_KIND.FACE | PICK_KIND.SKETCH | PICK_KIND.EDGE, (object, kind) => {
      if (kind === PICK_KIND.FACE) {
        if (this.selectionMgr.pick(object)) {
          return false;
        }
      } else if (kind === PICK_KIND.SKETCH) {
        if (this.sketchSelectionMgr.pick(object)) {
          return false;
        }
      } else if (kind === PICK_KIND.EDGE) {
        if (this.edgeSelectionMgr.pick(object)) {
          return false;
        }
      }
      return true;
    });
  }

  handleSolidPick(e) {
    this.raycastObjects(event, PICK_KIND.FACE, (sketchFace) => {
      this.selectionMgr.clear();
      this.bus.notify("solid-pick", sketchFace.solid);
      this.render();
      return false;
    });
  }

  raycastObjects(event, kind, visitor) {
    let pickResults = this.sceneSetup.raycast(event, this.workGroup);
    const pickers = [
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.SKETCH) && pickResult.object instanceof THREE.Line &&
          pickResult.object.__TCAD_SketchObject !== undefined) {
          return !visitor(pickResult.object, PICK_KIND.SKETCH);
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.EDGE) && pickResult.object.__TCAD_EDGE !== undefined) {
          return !visitor(pickResult.object, PICK_KIND.EDGE);
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.FACE) && !!pickResult.face && pickResult.face.__TCAD_SceneFace !== undefined) {
          const sketchFace = pickResult.face.__TCAD_SceneFace;
          return !visitor(sketchFace, PICK_KIND.FACE);
        }
        return false;
      },
    ];
    for (let i = 0; i < pickResults.length; i++) {
      const pickResult = pickResults[i];
      for (let picker of pickers) {
        if (picker(pickResult)) {
          return;
        }
      }
    }
  }
}

export const PICK_KIND = {
  FACE: mask.type(1),
  SKETCH: mask.type(2),
  EDGE: mask.type(3),
  VERTEX: mask.type(4)
};
