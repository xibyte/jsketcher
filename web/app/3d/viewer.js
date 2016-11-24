import * as cad_utils from './cad-utils'
import {Matrix3, AXIS, ORIGIN} from '../math/l3space'
import DPR from '../utils/dpr'

function Viewer(bus, container) {
  this.bus = bus;
  function aspect() {
    return container.clientWidth / container.clientHeight;
  }
  this.scene = new THREE.Scene();
  var scene = this.scene;
  this.camera = new THREE.PerspectiveCamera( 500*75, aspect(), 0.1, 10000 );
  this.camera.position.z = 1000;
  this.camera.position.x = -1000;
  this.camera.position.y = 300;
  var light = new THREE.PointLight( 0xffffff);
  light.position.set( 10, 10, 10 );
  scene.add(light);

  this.renderer = new THREE.WebGLRenderer();
  this.renderer.setPixelRatio(DPR);
  this.renderer.setClearColor(0x808080, 1);
  this.renderer.setSize( container.clientWidth, container.clientHeight );
  container.appendChild( this.renderer.domElement );
  
  this.render = function() {
    light.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.renderer.render(scene, this.camera);
  };

  window.addEventListener( 'resize', () => {
    this.camera.aspect = aspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( container.clientWidth, container.clientHeight );
    this.render();
  }, false );

//  controls = new THREE.OrbitControls( camera , renderer.domElement);
  var trackballControls = new THREE.TrackballControls(this.camera , this.renderer.domElement);

  // document.addEventListener( 'mousemove', function(){

  //   controls.update();

  // }, false );
  trackballControls.rotateSpeed = 3.8;
  trackballControls.zoomSpeed = 1.2;
  trackballControls.panSpeed = 0.8;

  trackballControls.noZoom = false;
  trackballControls.noPan = false;

  trackballControls.staticMoving = true;
  trackballControls.dynamicDampingFactor = 0.3;

  trackballControls.keys = [ 65, 83, 68 ];
  trackballControls.addEventListener( 'change', () => this.render());
  this.trackballControls = trackballControls;

  var transformControls = new THREE.TransformControls( this.camera, this.renderer.domElement );
  transformControls.addEventListener( 'change', () => this.render() );
  scene.add( transformControls );
  this.transformControls = transformControls;

  this.updateTransformControls = function() {
    if (transformControls.object !== undefined) {
      if (transformControls.object.parent === undefined) {
        transformControls.detach();
        this.render();
      }
      transformControls.update();
    }
  };

  function addAxis(axis, color) {
    var lineMaterial = new THREE.LineBasicMaterial({color: color, linewidth: 1/DPR});
    var axisGeom = new THREE.Geometry();
    axisGeom.vertices.push(axis.multiply(-1000).three());
    axisGeom.vertices.push(axis.multiply(1000).three());
    scene.add(new THREE.Line(axisGeom, lineMaterial));
  }
  addAxis(AXIS.X, 0xFF0000);
  addAxis(AXIS.Y, 0x00FF00);
  addAxis(AXIS.Z, 0x0000FF);

  this.updateControlsAndHelpers = function() {
    trackballControls.update();
    this.updateTransformControls();
  };

  this.workGroup = new THREE.Object3D();
  this.scene.add(this.workGroup);
  this.selectionMgr = new SelectionManager( this, 0xFAFAD2, 0xFF0000, null);
  var viewer = this;

  var raycaster = new THREE.Raycaster();

  this.raycast = function(event) {

    var x = ( event.offsetX / container.clientWidth ) * 2 - 1;
    var y = - ( event.offsetY / container.clientHeight ) * 2 + 1;

    var mouse = new THREE.Vector3( x, y, 1 );
    raycaster.setFromCamera( mouse, this.camera );
    return raycaster.intersectObjects( viewer.workGroup.children, true );
  };
  
  function onClick(e) {
    if (e.button != 0) {
      viewer.handleSolidPick(e);
    } else {
      viewer.selectionMgr.handlePick(e);
    }
  }
  
  var mouseState = {
    startX : 0,
    startY : 0
  };

  //fix for FireFox
  function fixOffsetAPI(event) {
    if (event.offsetX == undefined) {
      event.offsetX = event.layerX;
      event.offsetY = event.layerY;
    }
  }
  
  this.renderer.domElement.addEventListener('mousedown',
    function(e) {
      fixOffsetAPI(e);
      mouseState.startX = e.offsetX;
      mouseState.startY = e.offsetY;
    }, false);

  this.renderer.domElement.addEventListener('mouseup',
    function(e) {
      fixOffsetAPI(e);
      var dx = Math.abs(mouseState.startX - e.offsetX);
      var dy = Math.abs(mouseState.startY - e.offsetY);
      var TOL = 1;
      if (dx < TOL && dy < TOL) {
        onClick(e);
      }
    } , false);


  this.animate = function() {
    requestAnimationFrame( () => this.animate() );
    this.updateControlsAndHelpers();
  };

  this.render();
  this.animate();
}

Viewer.prototype.lookAt = function(obj) {
  var box = new THREE.Box3();
  box.setFromObject(obj);
  let size = box.size();
  //this.camera.position.set(0,0,0);
  box.center(this.camera.position);
  const maxSize = Math.max(size.x, size.z);
  const dist = maxSize / 2 / Math.tan(Math.PI * this.camera.fov / 360);
  this.camera.position.addScaledVector(this.camera.position.normalize(), 5000);

  //this.camera.position.sub(new THREE.Vector3(0, 0, dist));
  this.camera.up = new THREE.Vector3(0,1,0);
  
  
  this.render();  
};

Viewer.prototype.handleSolidPick = function(e) {
  this.raycastFaces(event, this, function(sketchFace) {
    this.selectionMgr.clear();
    this.bus.notify("solid-pick", sketchFace.solid);
    this.render();
    return false;
  });
};


Viewer.prototype.raycastFaces = function(event, scope, visitor) {
  var pickResults = this.raycast(event);
  for (var i = 0; i < pickResults.length; i++) {
    var pickResult = pickResults[i];
    if (!!pickResult.face && pickResult.face.__TCAD_polyFace !== undefined) {
      var sketchFace = pickResult.face.__TCAD_polyFace;
      if (!visitor.call(scope, sketchFace)) {
        break;
      }
    }
  }
};

Viewer.setFacesColor = function(faces, color) {
  for (var i = 0; i < faces.length; ++i) {
    var face = faces[i];
    if (color == null) {
      face.color.set(new THREE.Color());
    } else {
      face.color.set( color );
    }
  }
};

function SelectionManager(viewer, selectionColor, readOnlyColor, defaultColor) {
  this.viewer = viewer;
  this.selectionColor = selectionColor;
  this.readOnlyColor = readOnlyColor;
  this.defaultColor = defaultColor;
  this.selection = [];
  this.planeSelection = [];
  
  this.basisGroup = new THREE.Object3D();
  var length = 200;
  var arrowLength = length * 0.2;
  var arrowHead = arrowLength * 0.4;

  function createArrow(axis, color) {
    var arrow = new THREE.ArrowHelper(axis, new THREE.Vector3(0, 0, 0), length, color, arrowLength, arrowHead);
    arrow.updateMatrix();
    arrow.matrixAutoUpdate = false;
    arrow.line.renderOrder = 1e11;
    arrow.cone.renderOrder = 1e11;
    arrow.line.material.linewidth =  1/DPR;
    arrow.line.material.depthWrite = false;
    arrow.line.material.depthTest = false;
    arrow.cone.material.depthWrite = false;
    arrow.cone.material.depthTest = false;
    return arrow;
  }

  var xAxis = createArrow(new THREE.Vector3(1, 0, 0), 0xFF0000);
  var yAxis = createArrow(new THREE.Vector3(0, 1, 0), 0x00FF00);
  this.basisGroup.add(xAxis);
  this.basisGroup.add(yAxis);
}

SelectionManager.prototype.updateBasis = function(basis, depth) {
  this.basisGroup.matrix.identity();
  var mx = new THREE.Matrix4();
  mx.makeBasis(basis[0].three(), basis[1].three(), basis[2].three());
  var depthOff = new THREE.Vector3(0, 0, depth);
  depthOff.applyMatrix4(mx);
  mx.setPosition(depthOff);
  this.basisGroup.applyMatrix(mx);
};

SelectionManager.prototype.handlePick = function(event) {
  this.viewer.raycastFaces(event, this, function(sketchFace) {
    if (!this.contains(sketchFace)) {
      this.select(sketchFace);
      return false;
    }
    return true;
  });
};

SelectionManager.prototype.select = function(sketchFace) {
  this.clear();
  if (sketchFace.curvedSurfaces !== null) {
    for (var i = 0; i < sketchFace.curvedSurfaces.length; i++) {
      var face  = sketchFace.curvedSurfaces[i];
      this.selection.push(face);
      Viewer.setFacesColor(face.faces, this.readOnlyColor);
    }
  } else {
    this.selection.push(sketchFace);
    this.updateBasis(sketchFace.basis(), sketchFace.depth());
    sketchFace.solid.cadGroup.add(this.basisGroup);
    Viewer.setFacesColor(sketchFace.faces, this.selectionColor);
  }
  sketchFace.solid.mesh.geometry.colorsNeedUpdate = true;
  this.viewer.bus.notify('selection', sketchFace);
  this.viewer.render();
};

SelectionManager.prototype.deselectAll = function() {
  for (var i = 0; i < this.selection.length; ++ i) {
    this.selection[i].solid.mesh.geometry.colorsNeedUpdate = true;
  }
  this.clear();
  this.viewer.bus.notify('selection', null);
  this.viewer.render();
};

SelectionManager.prototype.contains = function(face) {
  return this.selection.indexOf(face) != -1;
};

SelectionManager.prototype.clear = function() {
  for (var i = 0; i < this.selection.length; ++ i) {
    Viewer.setFacesColor(this.selection[i].faces, this.defaultColor);
  }
  if (this.basisGroup.parent !== null ) this.basisGroup.parent.remove( this.basisGroup );
  this.selection.length = 0;
};

export {Viewer, SelectionManager}