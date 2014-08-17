
TCAD.Viewer = function() {

  function aspect() {
    return window.innerWidth / window.innerHeight;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, aspect(), 0.1, 1000 );

  var light = new THREE.PointLight( 0xffffff);
  light.position.set( 10, 10, 10 );
  scene.add(light);

  var renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x808080, 1);
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );


  function onWindowResize() {
    camera.aspect = aspect();
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    render();
  }
  window.addEventListener( 'resize', onWindowResize, false );

  var geometry = new THREE.BoxGeometry(1,1,1);

  var material = new THREE.MeshPhongMaterial( new THREE.MeshPhongMaterial({

    vertexColors: THREE.FaceColors,
    // light
//    specular: '#a9fcff',
    // intermediate
    color: '#B0C4DE',
    // dark
//    emissive: '#006063',
    shininess: 0
  }));
//  material = new THREE.MeshNormalMaterial( { shading: THREE.FlatShading, color: '#B0C4DE'  } );
//  material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe : false, vertexColors: THREE.FaceColors } );

//  var shader = THREE.ShaderLib['normal'];
//  material = new THREE.ShaderMaterial( {
//    uniforms: THREE.UniformsUtils.clone( shader.uniforms ),
//    vertexShader: shader.vertexShader,
//    fragmentShader: shader.fragmentShader.replace(/gl_FragColor.+\n/, 'gl_FragColor = vec4( 0.5, opacity );')
//  });


//  material = new THREE.ShaderMaterial({
//    fragmentShader: "void main() { \n" +
//      "gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); \n" +
//      "}"
//  });


  var cube = new THREE.Mesh( geometry, material );
//  cube.dynamic = true;
  scene.add( cube );

  camera.position.z = 5;

  cube.rotation.x += 1;
  cube.rotation.y += 1;

//  controls = new THREE.OrbitControls( camera , renderer.domElement);
  controls = new THREE.TrackballControls( camera , renderer.domElement);

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

  var projector = new THREE.Projector();
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector3(0, 0, 0);

  raycaster.ray.direction.set(0, -1, 0);
  var pickReq = {  };

  function pick(event) {

    var x = ( event.clientX / window.innerWidth ) * 2 - 1;
    var y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    var mouse = new THREE.Vector3( x, y, 1 );
//    console.log(event.clientX + ":"+event.clientY + " -> " + mouse.x + ":"+mouse.y);
    var ray = projector.pickingRay(mouse.clone(), camera);
    var intersects = ray.intersectObjects( scene.children );
    if (intersects.length > 0) {
//      console.log("Face Index: " + intersects[0].faceIndex);
//      console.log(intersects[0]);
      intersects[0].face.color.setHex( 0x00FF00 );
      cube.geometry.colorsNeedUpdate = true;
      render();
    }
  }
  renderer.domElement.addEventListener('mousedown', pick, false);


  function render() {
//    console.log("render");
    light.position.set(camera.position.x, camera.position.y, camera.position.z);
    renderer.render(scene, camera);
  }

  function animate() {
//    console.log("animate");
    requestAnimationFrame( animate );
    controls.update();
  }

  render();
  animate();
}