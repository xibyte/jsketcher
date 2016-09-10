import * as cad_utils from './cad-utils'
import {Matrix3, AXIS, ORIGIN} from '../math/l3space'
import DPR from '../utils/dpr'

function Viewer(bus) {
  this.bus = bus;
  function aspect() {
    return window.innerWidth / window.innerHeight;
  }
  this.scene = new THREE.Scene();
  var scene = this.scene;
  var camera = new THREE.PerspectiveCamera( 500*75, aspect(), 0.1, 10000 );
  this.camera = camera;
  camera.position.z = 1000;
  camera.position.x = -1000;
  camera.position.y = 300;
  var light = new THREE.PointLight( 0xffffff);
  light.position.set( 10, 10, 10 );
  scene.add(light);

  var renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x808080, 1);
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );
  function render() {
//    console.log("render");
    light.position.set(camera.position.x, camera.position.y, camera.position.z);
    renderer.render(scene, camera);
  }
  this.render = render;

  function onWindowResize() {
    camera.aspect = aspect();
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    render();
  }
  window.addEventListener( 'resize', onWindowResize, false );

//  controls = new THREE.OrbitControls( camera , renderer.domElement);
  var trackballControls = new THREE.TrackballControls( camera , renderer.domElement);

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
  trackballControls.addEventListener( 'change', render );
  this.trackballControls = trackballControls;

  var transformControls = new THREE.TransformControls( camera, renderer.domElement );
  transformControls.addEventListener( 'change', render );
  scene.add( transformControls );
  this.transformControls = transformControls;

  function updateTransformControls() {
    if (transformControls.object !== undefined) {
      if (transformControls.object.parent === undefined) {
        transformControls.detach();
        render();
      }
      transformControls.update();
    }
  }

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

  function updateControlsAndHelpers() {
    trackballControls.update();
    updateTransformControls();
  }

  this.workGroup = new THREE.Object3D();
  this.scene.add(this.workGroup);
  this.selectionMgr = new SelectionManager( this, 0xFAFAD2, 0xFF0000, null);
  var viewer = this;

  var raycaster = new THREE.Raycaster();

  this.raycast = function(event) {

    var x = ( event.clientX / window.innerWidth ) * 2 - 1;
    var y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    var mouse = new THREE.Vector3( x, y, 1 );
    raycaster.setFromCamera( mouse, camera );
    return raycaster.intersectObjects( viewer.workGroup.children, true );
  };
  
  function onClick(e) {
    viewer.selectionMgr.handlePick(e);
  }
  
  var mouseState = {
    startX : 0,
    startY : 0
  };

  renderer.domElement.addEventListener('mousedown',
    function(e) {
      mouseState.startX = e.clientX;
      mouseState.startY = e.clientY;
    }, false);

  renderer.domElement.addEventListener('mouseup',
    function(e) {
      var dx = Math.abs(mouseState.startX - e.clientX);
      var dy = Math.abs(mouseState.startY - e.clientY);
      var TOL = 1;
      if (dx < TOL && dy < TOL) {
        onClick(e);
      }
    } , false);

  function animate() {
//    console.log("animate");
    requestAnimationFrame( animate );
    updateControlsAndHelpers();
  }

  render();
  animate();
}

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
  this.basisGroup.visible = false;
  viewer.scene.add(this.basisGroup);
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

  var pickResults = this.viewer.raycast(event);
  for (var i = 0; i < pickResults.length; i++) {
    var pickResult = pickResults[i];
    if (!!pickResult.face && pickResult.face.__TCAD_polyFace !== undefined) {
      var sketchFace = pickResult.face.__TCAD_polyFace;
      if (!this.contains(sketchFace)) {
        this.select(sketchFace);
        break;
      }
    }
  }
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
    this.basisGroup.visible = true;
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
  this.viewer.render();
};

SelectionManager.prototype.contains = function(face) {
  return this.selection.indexOf(face) != -1;
};

SelectionManager.prototype.clear = function() {
  for (var i = 0; i < this.selection.length; ++ i) {
    Viewer.setFacesColor(this.selection[i].faces, this.defaultColor);
  }
  this.selection.length = 0;
  this.basisGroup.visible = false;
};

export {Viewer, SelectionManager}