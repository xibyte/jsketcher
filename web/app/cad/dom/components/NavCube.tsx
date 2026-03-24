import {AiFillHome} from 'react-icons/ai';
import React, {useContext, useEffect, useRef} from 'react';
import * as THREE from 'three';
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";

const SIZE = 120;

function makeFaceTex(hover, label, bgHex = '#12121a') {
  const tc = document.createElement('canvas');
  tc.width = 128; tc.height = 128;
  const tx = tc.getContext('2d');
  tx.clearRect(0, 0, 128, 128);
  const r = parseInt(bgHex.slice(1,3), 16) || 18;
  const g = parseInt(bgHex.slice(3,5), 16) || 18;
  const b = parseInt(bgHex.slice(5,7), 16) || 26;
  const rh = Math.min(r + 28, 255), gh = Math.min(g + 28, 255), bh = Math.min(b + 28, 255);
  tx.fillStyle = hover ? `rgba(${rh},${gh},${bh},1)` : `rgba(${r},${g},${b},1)`;
  tx.fillRect(0, 0, 128, 128);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = lum > 140 ? '#1a1a2e' : '#ffffff';
  const shadowCol  = lum > 140 ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.9)';
  tx.strokeStyle = lum > 140 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
  tx.lineWidth = 4;
  tx.strokeRect(2, 2, 124, 124);
  tx.fillStyle = textColor;
  tx.font = 'bold 26px sans-serif';
  tx.textAlign = 'center';
  tx.textBaseline = 'middle';
  tx.shadowColor = shadowCol;
  tx.shadowBlur = 6;
  tx.fillText(label, 64, 64);
  return new THREE.CanvasTexture(tc);
}

const faceLabels = ['RIGHT','LEFT','TOP','BOTTOM','FRONT','BACK'];
const faceNormals = [
  new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
  new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0),
  new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1),
];

const cornerDirs = [
  new THREE.Vector3( 1, 1, 1), new THREE.Vector3(-1, 1, 1),
  new THREE.Vector3( 1, 1,-1), new THREE.Vector3(-1, 1,-1),
  new THREE.Vector3( 1,-1, 1), new THREE.Vector3(-1,-1, 1),
  new THREE.Vector3( 1,-1,-1), new THREE.Vector3(-1,-1,-1),
];

const edgeDirs = [
  new THREE.Vector3( 1, 1, 0), new THREE.Vector3(-1, 1, 0),
  new THREE.Vector3( 0, 1, 1), new THREE.Vector3( 0, 1,-1),
  new THREE.Vector3( 1,-1, 0), new THREE.Vector3(-1,-1, 0),
  new THREE.Vector3( 0,-1, 1), new THREE.Vector3( 0,-1,-1),
  new THREE.Vector3( 1, 0, 1), new THREE.Vector3(-1, 0, 1),
  new THREE.Vector3( 1, 0,-1), new THREE.Vector3(-1, 0,-1),
];

export default function NavCube() {
  const ctx = useContext(ReactApplicationContext);
  const canvasRef = useRef(null);
  const homeRef = useRef(null);

  useEffect(() => {
    if (!ctx.viewer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, premultipliedAlpha:false});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x1a1a21, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(4.2, 4.2, 4.2);
    camera.lookAt(0,0,0);

    let lastBg = '';
    let texNormal = faceLabels.map(label => makeFaceTex(false, label));
    let texHover  = faceLabels.map(label => makeFaceTex(true,  label));
    const mats = faceLabels.map((_,i) => new THREE.MeshBasicMaterial({map:texNormal[i], transparent:true, depthWrite:false, side:THREE.FrontSide}));

    function rebuildTextures(bg) {
      texNormal.forEach(t => t.dispose());
      texHover.forEach(t => t.dispose());
      texNormal = faceLabels.map(label => makeFaceTex(false, label, bg));
      texHover  = faceLabels.map(label => makeFaceTex(true,  label, bg));
      mats.forEach((m, i) => { m.map = texNormal[i]; m.needsUpdate = true; });
    }
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mats);
    scene.add(cube);

    const sphereMat = new THREE.MeshBasicMaterial({color:0xa3a3a3});
    sphereMat.userData.origColor = 0xa3a3a3;
    const clickables = [cube];

    cornerDirs.forEach(dir => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), sphereMat.clone());
      m.position.copy(dir.clone().multiplyScalar(0.5));
      m.userData.snapNormal = dir.clone().normalize();
      scene.add(m);
      clickables.push(m);
    });

    edgeDirs.forEach(dir => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), sphereMat.clone());
      const pos = new THREE.Vector3(
        dir.x !== 0 ? 0.5 * Math.sign(dir.x) : 0,
        dir.y !== 0 ? 0.5 * Math.sign(dir.y) : 0,
        dir.z !== 0 ? 0.5 * Math.sign(dir.z) : 0,
      );
      m.position.copy(pos);
      m.userData.snapNormal = dir.clone().normalize();
      scene.add(m);
      clickables.push(m);
    });

    const ray = new THREE.Raycaster();
    let hoveredObj = null;

    function snapTo(normal) {
      const viewer = ctx.viewer;
      const controls = viewer.sceneSetup.trackballControls;
      const target = controls.target.clone();
      const dist = viewer.sceneSetup.camera.position.distanceTo(target);
      const up = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(0,0,-1) : new THREE.Vector3(0,1,0);

      const startPos = viewer.sceneSetup.camera.position.clone();
      const endPos = target.clone().addScaledVector(normal, dist);
      const startUp = viewer.sceneSetup.camera.up.clone();
      const duration = 600;
      const start = performance.now();

      function ease(t) { return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }

      function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        const e = ease(t);
        viewer.sceneSetup.camera.position.lerpVectors(startPos, endPos, e);
        viewer.sceneSetup.camera.up.lerpVectors(startUp, up, e);
        controls.target.copy(target);
        controls.object = viewer.sceneSetup.camera;
        viewer.render();
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function getMouse(e) {
      const rect = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX-rect.left)/rect.width)*2-1,
        -((e.clientY-rect.top)/rect.height)*2+1
      );
    }

    canvas.addEventListener('mousemove', e => {
      ray.setFromCamera(getMouse(e), camera);
      const hits = ray.intersectObjects(clickables);
      mats.forEach((m,i) => m.map = texNormal[i]);
      if (hoveredObj && hoveredObj !== cube) {
        hoveredObj.material.color.setHex(hoveredObj.material.userData.origColor ?? hoveredObj.material.color.getHex());
      }
      hoveredObj = null;
      if (hits.length) {
        const obj = hits[0].object;
        if (obj === cube) {
          const fi = hits[0].face.materialIndex;
          mats[fi].map = texHover[fi];
        } else {
          obj.material.color.setHex(0x4d9cf8);
        obj.material.opacity = 0.9;
        }
        hoveredObj = obj;
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    });

    canvas.addEventListener('click', e => {
      ray.setFromCamera(getMouse(e), camera);
      const hits = ray.intersectObjects(clickables);
      if (!hits.length) return;
      const obj = hits[0].object;
      const controls = ctx.viewer.sceneSetup.trackballControls;
      controls.target.set(0, 0, 0);
      if (obj === cube) {
        snapTo(faceNormals[hits[0].face.materialIndex]);
      } else if (obj.userData.snapNormal) {
        snapTo(obj.userData.snapNormal);
      }
    });

    const detacher = ctx.viewer.sceneSetup.sceneRendered$.attach(() => {
      const cp = ctx.viewer.sceneSetup.camera.position;
      camera.position.set(cp.x, cp.y, cp.z).normalize().multiplyScalar(4.2);
      camera.lookAt(0,0,0);
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-color-0').trim() || '#12121a';
      if (bg !== lastBg) { lastBg = bg; rebuildTextures(bg); }
      renderer.render(scene, camera);
    });

    if (homeRef.current) {
      homeRef.current.addEventListener('click', () => {
        const controls = ctx.viewer.sceneSetup.trackballControls;
        controls.target.set(0, 0, 0);
        snapTo(new THREE.Vector3(1,1,1).normalize());
      });
    }

    return () => { detacher(); renderer.dispose(); };
  }, [canvasRef.current, ctx.viewer]);

  return (
    <div style={{position:'absolute',top:'-30px',right:'12px',zIndex:50,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',pointerEvents:'auto',background:'transparent'}}>
      <div
        ref={homeRef}
        tabIndex={-1}
        style={{position:'absolute',top:'40px',left:'-36px',width:'28px',height:'28px',background:'transparent',border:'1px solid transparent',borderRadius:'5px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#7a7a96',fontSize:'13px',outline:'none',userSelect:'none'}}
        title="Home view"
      ><AiFillHome size={14} style={{display:'block',pointerEvents:'none'}}/></div>
      <canvas ref={canvasRef} tabIndex={-1} width={SIZE} height={SIZE} style={{display:'block',borderRadius:'10px',marginTop:'32px',outline:'none',background:'transparent'}}/>
    </div>
  );
}
