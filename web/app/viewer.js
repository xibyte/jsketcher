
TCAD.view = {};

TCAD.view.setFaceColor = function(polyFace, color) {
  for (var i = 0; i < polyFace.faces.length; ++i) {
    var face = polyFace.faces[i];
    face.color.set( color );
  }
};

TCAD.Viewer = function() {

  function aspect() {
    return window.innerWidth / window.innerHeight;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, aspect(), 0.1, 1000 );
  camera.position.z = 5;

  var light = new THREE.PointLight( 0xffffff);
  light.position.set( 10, 10, 10 );
  scene.add(light);

  var renderer = new THREE.WebGLRenderer();
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


//  var geometry = new THREE.BoxGeometry(1,1,1);
//  var geometry = new TCAD.Solid([TCAD.utils.createSquare(1)]);
  
  var box = TCAD.utils.createSolid(TCAD.utils.createBox(1));
  scene.add( box );
  
  
  /**
   * CONTROLS
   **/

//  controls = new THREE.OrbitControls( camera , renderer.domElement);
  var controls = new THREE.TrackballControls( camera , renderer.domElement);

  // document.addEventListener( 'mousemove', function(){

  //   controls.update();

  // }, false );
  controls.rotateSpeed = 3.8;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  controls.keys = [ 65, 83, 68 ];
  controls.addEventListener( 'change', render );


  /**
   * TOOLS
   **/

  this.toolMgr = new TCAD.ToolManager(this);


  /**
   * FACE SELECTING
   **/


  this.selectionMgr = new TCAD.FaceSelectionManager( 0xFAFAD2, 0xB0C4DE);

  var projector = new THREE.Projector();
  var raycaster = new THREE.Raycaster();
  raycaster.ray.direction.set(0, -1, 0);

  this.raycast = function(event) {

    var x = ( event.clientX / window.innerWidth ) * 2 - 1;
    var y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    var mouse = new THREE.Vector3( x, y, 1 );
    var ray = projector.pickingRay(mouse.clone(), camera);
    var intersects = ray.intersectObjects( scene.children );
    if (intersects.length > 0) {
      var pickResult = intersects[0];
      if (pickResult.face.__TCAD_polyFace !== undefined) {
        var poly = pickResult.face.__TCAD_polyFace;
        if (this.selectionMgr.contains(poly)) {
          this.toolMgr.handle(poly, pickResult);            
        } else {
          this.selectionMgr.select(poly);
          pickResult.object.geometry.colorsNeedUpdate = true;
        }
      }
      render();
    }
  };
  
  var scope = this;
  
  var mouseState = {
    moved : false
  };

  function onMove() {
    mouseState.moved = true;
  }

  renderer.domElement.addEventListener('mousedown', 
    function() {
      mouseState.moved = false;
      renderer.domElement.addEventListener('mousemove', onMove, false);
    }, false);
  
  renderer.domElement.addEventListener('mouseup', 
    function(e) {
      renderer.domElement.removeEventListener('mousemove', onMove);
      if (!mouseState.moved) {
        scope.raycast(e);
      }
    } , false);

  function animate() {
//    console.log("animate");
    requestAnimationFrame( animate );
    controls.update();
  }

  render();
  animate();
};

TCAD.FaceSelectionManager = function(selectionColor, defaultColor) {
  this.selectionColor = selectionColor;
  this.defaultColor = defaultColor;
  this.selection = [];
};

TCAD.FaceSelectionManager.prototype.select = function(polyFace) {
  this.clear();
  this.selection.push(polyFace);
  TCAD.view.setFaceColor(polyFace, this.selectionColor);
};

TCAD.FaceSelectionManager.prototype.contains = function(polyFace) {
  return this.selection.indexOf(polyFace) != -1;
};

TCAD.FaceSelectionManager.prototype.clear = function() {
  for (var i = 0; i < this.selection.length; ++ i) {
    TCAD.view.setFaceColor(this.selection[i], this.defaultColor);
  }
  this.selection.length = 0;
};

TCAD.ToolManager = function(viewer) {
  this.viewer = viewer;
  this.tool = null;
};

TCAD.ToolManager.prototype.handle = function(face, pickResult) {
  if (this.tool == null) {
    return;    
  }
  if (this.tool.workArea != face) {
    return;    
  }
  if (this.tool.workArea.sketch == null) {
    this.tool.workArea.sketch = new TCAD.Sketch();
    pickResult.object.parent.add(this.tool.workArea.sketch.group);
  }
  this.tool.handle(face, pickResult);
};

TCAD.ToolManager.prototype.commit = function() {
  if (this.tool == null) {
    return;
  }
  this.tool.commit();
  this.viewer.render();
};

TCAD.PolygonTool = function(workArea) {
  this.workArea = workArea;
  this.poly = {shell : [], holes : []};
};

TCAD.PolygonTool.prototype.handle = function(face, pickResult) {
  this.poly.shell.push(new TCAD.Vector().setV(pickResult.point));
  var point = TCAD.utils.createPoint();
  point.position.x = pickResult.point.x;
  point.position.y = pickResult.point.y;
  point.position.z = pickResult.point.z;
  this.workArea.sketch.group.add(point);
};

TCAD.PolygonTool.prototype.commit = function() {
  var n = this.workArea.polygon.normal;
  var _2d = new TCAD.Polygon(this.poly.shell, this.poly.holes, n);
  
  var solid = TCAD.utils.createSolid(TCAD.geom.extrude(_2d, n.multiply(1.1)));
  this.workArea.sketch.group.parent.add(solid);
};

