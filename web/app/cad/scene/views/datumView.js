import {View} from './view';
import DatumObject3D from '../../craft/datum/datumObject';
import {DATUM, DATUM_AXIS} from '../../model/entities';
import {setAttribute} from 'scene/objectData';
import {Mesh, MeshBasicMaterial, PolyhedronGeometry, SphereGeometry} from 'three';
import {CSYS_SIZE_MODEL} from '../../craft/datum/csysObject';

export default class DatumView extends View {

  constructor(ctx, datum, beginOperation, selectDatum, showDatumMenu, isReadOnly) {
    super(ctx, datum);

    const viewer = ctx.viewer;

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

      onMouseLeave(e) {
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

      onMouseClick({mouseEvent: e}) {
        if (!this.material.visible) {
          return;
        }
        selectDatum(datum);
        showDatumMenu({
          x: e.offsetX,
          y: e.offsetY
        });
      }
      
      updateVisibility() {
        const datum3D = this.parent.parent;
        viewer.setVisualProp(this.material, 'visible', !datum3D.operationStarted && 
          (this.mouseInside || datum3D.affordanceArea.mouseInside));
      }
    }

    class ActiveAffordanceBox extends AffordanceBox {

      mouseInside;
      
      onMouseEnter(e) {
        this.mouseInside = true;
        this.parent.parent.menuButton.updateVisibility();
        
      }
      
      onMouseLeave(e) {
        this.mouseInside = false;
        this.parent.parent.menuButton.updateVisibility();
      }

      passMouseEvent(e) {
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

      dragStart(event, axis) {
        ctx.craftService.historyTravel.setPointer(datum.originatingOperation - 1, {
          preDrag: {
            event, axis: axis.name
          }
        });
        // if (!isReadOnly() && !this.operationStarted) {
          // const history = ctx.craftService.modifications$.value.history;
          // selectDatum(datum);
          // beginOperation('DATUM_MOVE');
        // }
        // super.dragStart(event, axis);
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

    const dv = new StartingOperationDatumObject3D(datum.csys, viewer);
    this.rootGroup = dv;
    
    setAttribute(this.rootGroup, DATUM, this);
    setAttribute(this.rootGroup, View.MARKER, this);

    this.xAxisView = new DatumAxisView(ctx, this.model.xAxis, dv.csysObj.xAxis);
    this.yAxisView = new DatumAxisView(ctx, this.model.yAxis, dv.csysObj.yAxis);
    this.zAxisView = new DatumAxisView(ctx, this.model.zAxis, dv.csysObj.zAxis);
  }

  dispose() {
    super.dispose();
    this.rootGroup.dispose();
    this.xAxisView.dispose();
    this.yAxisView.dispose();
    this.zAxisView.dispose();
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
    
    const size = CSYS_SIZE_MODEL * 1.5;
    const shift = -(size - CSYS_SIZE_MODEL) * 0.3;
    this.scale.set(size, size, size);
    this.position.set(shift, shift, shift);
  }
  
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

class DatumAxisView extends View {

  constructor(ctx, model, axisArrow) {
    super(ctx, model);
    this.axisArrow = axisArrow;
    setAttribute(this.axisArrow.handle, DATUM_AXIS, this);
  }
  
  mark(color = 0x68FFE2) {
    this.axisArrow.handle.setSelected(color);
  }

  withdraw() {
    this.axisArrow.handle.setSelected(null);
  }
}