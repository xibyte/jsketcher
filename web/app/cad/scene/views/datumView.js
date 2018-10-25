import {View} from './view';
import DatumObject3D from '../../craft/datum/datumObject';
import {DATUM} from '../entites';
import {setAttribute} from 'scene/objectData';
import {Mesh, MeshBasicMaterial, PolyhedronGeometry, SphereGeometry} from 'three';
import {CSYS_SIZE_MODEL} from '../../craft/datum/csysObject';
import {NOOP} from '../../../../../modules/gems/func';

export default class DatumView extends View {

  constructor(datum, viewer, beginOperation, selectDatum, showDatumMenu) {
    super(datum);

    class MenuButton extends Mesh {

      mouseInside;

      constructor() {
        super(new SphereGeometry( 1 ), new MeshBasicMaterial({
          transparent: true,
          opacity: 0.5,
          color: 0xFFFFFF,
          visible: false
        }));
        this.scale.multiplyScalar(CSYS_SIZE_MODEL * 0.2);
      }
      
      dispose() {
        this.geometry.dispose();
        this.material.dispose();
      }

      onMouseEnter() {
        this.mouseInside = true;
        this.updateVisibility();
        this.material.color.setHex(0xFBB4FF);
        viewer.requestRender();
      }

      onMouseLeave(e, hits, behindHits) {
        this.mouseInside = false;
        this.updateVisibility();
        this.material.color.setHex(0xFFFFFF);
        viewer.requestRender();
      }

      onMouseDown() {
        this.material.color.setHex(0xB500FF);
        viewer.requestRender();
      }
      
      onMouseUp() {
        this.material.color.setHex(0xFBB4FF);
        viewer.requestRender();
      }

      onMouseClick(e) {
        selectDatum(datum.id);
        showDatumMenu({
          x: e.offsetX,
          y: e.offsetY
        });
      }
      
      updateVisibility() {
        let datum3D = this.parent.parent;
        viewer.setVisualProp(this.material, 'visible', !datum3D.operationStarted && 
          (this.mouseInside || datum3D.affordanceArea.mouseInside));
      }
    }

    class ActiveAffordanceBox extends AffordanceBox {

      mouseInside;
      
      onMouseEnter(e, hits) {
        this.mouseInside = true;
        this.parent.parent.menuButton.updateVisibility();
        
      }
      
      onMouseLeave(e, hits) {
        this.mouseInside = false;
        this.parent.parent.menuButton.updateVisibility();
      }

      passMouseEvent(e, hits) {
        return true;
      }
    }
    
    class StartingOperationDatumObject3D extends DatumObject3D {

      operationStarted = false;

      constructor(csys, viewer) {
        super(csys, viewer);
        this.affordanceArea = new ActiveAffordanceBox();
        this.menuButton = new MenuButton();
        this.csysObj.add(this.affordanceArea);
        this.csysObj.add(this.menuButton);
      }

      dragStart(e, axis) {
        if (!this.operationStarted) {
          selectDatum(datum.id);
          beginOperation('DATUM_MOVE');
          this.beginOperation();
        }
        super.dragStart(e, axis);
      }

      beginOperation(freezeDragging = false) {
        this.freezeDragging = freezeDragging;
        this.operationStarted = true;
        this.menuButton.updateVisibility();
      }

      finishOperation() {
        this.freezeDragging = false;
        this.operationStarted = false;
        this.exitEditMode();
        this.menuButton.updateVisibility();
      }
      
      dispose() {
        super.dispose();
        this.affordanceArea.dispose();
        this.menuButton.dispose();
      }
    }
    this.rootGroup = new StartingOperationDatumObject3D(datum.csys, viewer);
    
    setAttribute(this.rootGroup, DATUM, this);
    setAttribute(this.rootGroup, View.MARKER, this);
  }

  dispose() {
    super.dispose();
    this.rootGroup.dispose();
  }
}

class AffordanceBox extends Mesh {
  
  constructor() {
    super(new PolyhedronGeometry(
      [0,0,0, 1,0,0, 0,1,0,  0,0,1],
      [0,2,1, 0,1,3, 0,3,2, 1,2,3]
    ), new MeshBasicMaterial({
      transparent: true,
      opacity: 0.5,
      color: 0xAA8439,
      visible: false
    }));
    
    let size = CSYS_SIZE_MODEL * 1.5;
    let shift = -(size - CSYS_SIZE_MODEL) * 0.3;
    this.scale.set(size, size, size);
    this.position.set(shift, shift, shift);
  }
  
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}