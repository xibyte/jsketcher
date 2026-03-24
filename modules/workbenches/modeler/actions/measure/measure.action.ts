import React, {useContext, useEffect, useRef, useState} from 'react';
import ReactDOM from 'react-dom';
import {TbRuler} from 'react-icons/tb';
import {Line, BufferGeometry, BufferAttribute, LineBasicMaterial, LineDashedMaterial,
        Vector3, Vector2, SphereGeometry, MeshBasicMaterial, Mesh, Raycaster} from 'three';
import {ApplicationContext} from "cad/context";
import {FormEditContext} from "cad/craft/wizard/components/form/Form";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {getAttribute} from 'scene/objectData';
import {FACE} from 'cad/model/entities';
import {View} from 'cad/scene/views/view';

// Empty schema — interaction handled entirely via canvas events
const measureSchema = {};

type Pt = {x: number, y: number, z: number};
type SnapPoint = Pt & {type: 'vertex' | 'midpoint' | 'center'};

function project(pt: Pt, camera, el: HTMLElement): {x: number, y: number} {
  const v = new Vector3(pt.x, pt.y, pt.z);
  v.project(camera);
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
    y: rect.top  + (-v.y * 0.5 + 0.5) * rect.height,
  };
}

// Convert a point from verb array or {x,y,z} to array
function ptToArr(p: any): [number, number, number] | null {
  if (!p) return null;
  if (Array.isArray(p)) return [p[0], p[1], p[2]];
  if (typeof p.x === 'number') return [p.x, p.y, p.z];
  return null;
}

// 3D circumcenter of three points (the center of the circle passing through all three)
function circumcenter3D(p0: number[], p1: number[], p2: number[]): Pt | null {
  const ax = p1[0]-p0[0], ay = p1[1]-p0[1], az = p1[2]-p0[2];
  const bx = p2[0]-p0[0], by = p2[1]-p0[1], bz = p2[2]-p0[2];
  const nx = ay*bz-az*by, ny = az*bx-ax*bz, nz = ax*by-ay*bx;
  const n2 = nx*nx+ny*ny+nz*nz;
  if (n2 < 1e-12) return null;
  const b2 = bx*bx+by*by+bz*bz;
  const ab = ax*bx+ay*by+az*bz;
  const tx = b2*ax-ab*bx, ty = b2*ay-ab*by, tz = b2*az-ab*bz;
  return {
    x: p0[0]+(ty*nz-tz*ny)/(2*n2),
    y: p0[1]+(tz*nx-tx*nz)/(2*n2),
    z: p0[2]+(tx*ny-ty*nx)/(2*n2),
  };
}

// Sample 4 points on a curve; if all lie on a circle, return its center
function tryCircleCenter(curve: any): Pt | null {
  try {
    const uMin = curve.uMin ?? 0;
    const uMax = curve.uMax ?? 1;
    const r = uMax - uMin;
    if (r < 1e-6) return null;
    const p0 = ptToArr(curve.point(uMin + r * 0.00));
    const p1 = ptToArr(curve.point(uMin + r * 0.25));
    const p2 = ptToArr(curve.point(uMin + r * 0.50));
    const p3 = ptToArr(curve.point(uMin + r * 0.75));
    if (!p0 || !p1 || !p2 || !p3) return null;
    // Degenerate check — if start ≈ mid, it's a point or line
    const span = Math.hypot(p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]);
    if (span < 0.001) return null;
    const center = circumcenter3D(p0, p1, p2);
    if (!center) return null;
    const rad = Math.hypot(center.x-p0[0], center.y-p0[1], center.z-p0[2]);
    if (rad < 0.001) return null;
    // span = 2R·sin(θ/4) where θ is the total arc angle.
    // Reject if arc spans less than ~20° (nearly straight) or radius is implausibly large.
    const sinHalfHalf = span / (2 * rad);
    if (sinHalfHalf > 1) return null;
    const arcAngleDeg = 4 * (Math.asin(sinHalfHalf) * 180 / Math.PI);
    if (arcAngleDeg < 20) return null;
    // Verify 4th point is also on the same circle
    const r3 = Math.hypot(center.x-p3[0], center.y-p3[1], center.z-p3[2]);
    if (Math.abs(rad - r3) / rad > 0.02) return null;
    return center;
  } catch(e) { return null; }
}

function ptDist3(a: Pt, b: Pt) {
  return Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
}

function getSnapsForFace(brepFace): SnapPoint[] {
  try {
    // Use face.edges iterator — covers outer loop + any inner loops
    const halfEdges: any[] = brepFace.outerLoop?.halfEdges ?? [];
    if (halfEdges.length === 0) return [];

    const snaps: SnapPoint[] = [];
    const circleCenters: Pt[] = [];
    const seenVertices = new Set<string>();

    for (const he of halfEdges) {
      const vA = he.vertexA?.point;
      if (!vA) continue;

      // Deduplicate vertices (seam edges share the same vertex)
      const vKey = `${vA.x.toFixed(4)},${vA.y.toFixed(4)},${vA.z.toFixed(4)}`;
      if (!seenVertices.has(vKey)) {
        seenVertices.add(vKey);
        snaps.push({x: vA.x, y: vA.y, z: vA.z, type: 'vertex'});
      }

      const curve = he.edge?.curve;
      if (curve) {
        // Accurate midpoint using the curve's own cached middle-point
        const mid = curve.middlePoint?.() ?? ptToArr(curve.point((curve.uMin + curve.uMax) / 2));
        const midArr = ptToArr(mid);
        if (midArr) snaps.push({x: midArr[0], y: midArr[1], z: midArr[2], type: 'midpoint'});

        // Circle center detection — deduplicated
        const cc = tryCircleCenter(curve);
        if (cc && !circleCenters.some(c => ptDist3(c, cc) < 0.5)) {
          circleCenters.push(cc);
          snaps.push({...cc, type: 'center'});
        }
      } else {
        const vB = he.vertexB?.point;
        if (vB) snaps.push({x:(vA.x+vB.x)/2, y:(vA.y+vB.y)/2, z:(vA.z+vB.z)/2, type: 'midpoint'});
      }
    }

    // Face center — evaluate on the surface so it's always ON the geometry
    const srf = brepFace.surface;
    if (srf?.point && srf.uMid != null && srf.vMid != null) {
      const fp = ptToArr(srf.point(srf.uMid, srf.vMid));
      if (fp) {
        const fc: Pt = {x: fp[0], y: fp[1], z: fp[2]};
        if (!circleCenters.some(c => ptDist3(c, fc) < 1.0)) {
          snaps.push({...fc, type: 'center'});
        }
      }
    }

    return snaps;
  } catch(e) {
    return [];
  }
}

function findFaceAt(ctx, event: MouseEvent) {
  const sceneSetup = ctx.viewer.sceneSetup;
  const el = sceneSetup.renderer.domElement;
  const rect = el.getBoundingClientRect();
  const meshes: any[] = [];
  ctx.cadScene.workGroup.traverse((child: any) => {
    if (!child.isMesh) return;
    // Skip meshes inside hidden groups
    let node = child;
    while (node) { if (!node.visible) return; node = node.parent; }
    meshes.push(child);
  });
  if (meshes.length === 0) return null;
  const raycaster = new Raycaster();
  raycaster.setFromCamera(
    new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    ),
    sceneSetup.camera
  );
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return null;
  return getAttribute(hits[0].object, FACE) ?? null;
}

function nearestSnap(snaps: SnapPoint[], mx: number, my: number, camera, el: HTMLElement): SnapPoint | null {
  let best: SnapPoint = null, bestD = Infinity;
  for (const s of snaps) {
    const p = project(s, camera, el);
    const d = Math.hypot(mx - p.x, my - p.y);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

// ─── Three.js helpers ────────────────────────────────────────────────────────

function createDynLine(color: number, dashed = false) {
  const positions = new Float32Array(6);
  const geo = new BufferGeometry();
  const attr = new BufferAttribute(positions, 3);
  geo.setAttribute('position', attr);
  const mat = dashed
    ? new LineDashedMaterial({color, depthTest: false, dashSize: 8, gapSize: 6})
    : new LineBasicMaterial({color, depthTest: false});
  const line = new Line(geo, mat);
  line.renderOrder = 999;
  return {line, geo, mat, attr, dashed};
}

function setLinePoints(e: any, ax, ay, az, bx, by, bz) {
  const a = e.attr.array as Float32Array;
  a[0]=ax; a[1]=ay; a[2]=az; a[3]=bx; a[4]=by; a[5]=bz;
  e.attr.needsUpdate = true;
  if (e.dashed) e.line.computeLineDistances();
}

function makeDot(color: number, radius = 4) {
  const geo = new SphereGeometry(radius, 8, 8);
  const mat = new MeshBasicMaterial({color, depthTest: false});
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 999;
  return {mesh, geo, mat};
}

// ─── Measure lines overlay ───────────────────────────────────────────────────

function MeasureLines({ptA, ptB, showX, showY, showZ, showD}) {
  const ctx = useContext(ReactApplicationContext);
  const [labels, setLabels] = useState<any[]>([]);

  useEffect(() => {
    if (!ptA || !ptB) { setLabels([]); return; }
    const aux = ctx.cadScene.auxGroup;
    const ss  = ctx.viewer.sceneSetup;

    const lineD = showD ? createDynLine(0x00ccff) : null;
    const lineX = showX ? createDynLine(0xff4444) : null;
    const lineY = showY ? createDynLine(0x44dd44) : null;
    const lineZ = showZ ? createDynLine(0x4499ff) : null;
    const lines = [lineD, lineX, lineY, lineZ].filter(Boolean);
    lines.forEach(l => aux.add(l.line));

    const dotA = makeDot(0x00ccff, 4);
    const dotB = makeDot(0x00ccff, 4);
    aux.add(dotA.mesh); aux.add(dotB.mesh);

    const update = () => {
      const a = ptA, b = ptB;
      dotA.mesh.position.set(a.x, a.y, a.z);
      dotB.mesh.position.set(b.x, b.y, b.z);

      const c1 = {x:b.x, y:a.y, z:a.z};
      const c2 = {x:b.x, y:b.y, z:a.z};

      if (lineD) setLinePoints(lineD, a.x,a.y,a.z, b.x,b.y,b.z);
      if (lineX) setLinePoints(lineX, a.x,a.y,a.z, c1.x,c1.y,c1.z);
      if (lineY) setLinePoints(lineY, c1.x,c1.y,c1.z, c2.x,c2.y,c2.z);
      if (lineZ) setLinePoints(lineZ, c2.x,c2.y,c2.z, b.x,b.y,b.z);

      const cam = ss.camera, el = ss.renderer.domElement;
      const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
      const newLabels: any[] = [];

      if (showD) {
        const p = project({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2}, cam, el);
        newLabels.push({key:'D',...p, text:Math.sqrt(dx*dx+dy*dy+dz*dz).toFixed(4), color:'#00ccff'});
      }
      if (showX && Math.abs(dx)>0.0001) {
        const p = project({x:(a.x+c1.x)/2,y:c1.y,z:c1.z}, cam, el);
        newLabels.push({key:'X',...p, text:'X: '+Math.abs(dx).toFixed(4), color:'#ff6666'});
      }
      if (showY && Math.abs(dy)>0.0001) {
        const p = project({x:c1.x,y:(c1.y+c2.y)/2,z:c1.z}, cam, el);
        newLabels.push({key:'Y',...p, text:'Y: '+Math.abs(dy).toFixed(4), color:'#66ee66'});
      }
      if (showZ && Math.abs(dz)>0.0001) {
        const p = project({x:c2.x,y:c2.y,z:(c2.z+b.z)/2}, cam, el);
        newLabels.push({key:'Z',...p, text:'Z: '+Math.abs(dz).toFixed(4), color:'#6699ff'});
      }
      setLabels(newLabels);
    };

    update();
    const unsub = ss.sceneRendered$.attach(update);
    ctx.viewer.requestRender();

    return () => {
      lines.forEach(l => { aux.remove(l.line); l.geo.dispose(); l.mat.dispose(); });
      aux.remove(dotA.mesh); dotA.geo.dispose(); dotA.mat.dispose();
      aux.remove(dotB.mesh); dotB.geo.dispose(); dotB.mat.dispose();
      unsub(); setLabels([]); ctx.viewer.requestRender();
    };
  }, [ptA, ptB, showX, showY, showZ, showD]);

  return ReactDOM.createPortal(
    React.createElement(React.Fragment, null,
      ...labels.map(l => React.createElement('div', {
        key: l.key,
        style: {
          position:'fixed', left:l.x, top:l.y,
          transform:'translate(-50%,-130%)',
          background:'rgba(0,0,0,0.75)', color:l.color,
          padding:'2px 8px', borderRadius:4, fontSize:12,
          fontWeight:700, pointerEvents:'none', whiteSpace:'nowrap',
        }
      }, l.text))
    ),
    document.body
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({label, color, checked, onChange}) {
  return React.createElement('label', {
    style:{display:'flex',alignItems:'center',gap:3,cursor:'pointer',color,fontSize:12,fontWeight:600}
  },
    React.createElement('input', {type:'checkbox', checked, onChange:e=>onChange(e.target.checked), style:{cursor:'pointer'}}),
    label
  );
}

// ─── Main Form ───────────────────────────────────────────────────────────────

function MeasureForm() {
  const ctx = useContext(ReactApplicationContext);

  const [ptA, setPtA] = useState<Pt|null>(null);
  const [ptB, setPtB] = useState<Pt|null>(null);
  const [showD, setShowD] = useState(true);
  const [showX, setShowX] = useState(true);
  const [showY, setShowY] = useState(true);
  const [showZ, setShowZ] = useState(true);

  const ptARef = useRef<Pt|null>(null);
  const ptBRef = useRef<Pt|null>(null);
  const snapOverlayRef = useRef<HTMLDivElement>(null);
  const selectedOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ptARef.current = ptA; }, [ptA]);
  useEffect(() => { ptBRef.current = ptB; }, [ptB]);

  // Suppress edge/face hover highlights while measure mode is active
  useEffect(() => {
    View.SUPPRESS_HIGHLIGHTS = true;
    return () => { View.SUPPRESS_HIGHLIGHTS = false; };
  }, []);

  // Create the snap marker overlay div (imperative — no React re-render on hover)
  useEffect(() => {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9998;';
    document.body.appendChild(div);
    snapOverlayRef.current = div;

    const selDiv = document.createElement('div');
    selDiv.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;';
    document.body.appendChild(selDiv);
    selectedOverlayRef.current = selDiv;

    return () => {
      document.body.removeChild(div);
      document.body.removeChild(selDiv);
    };
  }, []);

  // Keep selected-point dots in sync with camera movement
  useEffect(() => {
    const ss = ctx.viewer.sceneSetup;
    const el = ss.renderer.domElement;
    const render = () => {
      const selDiv = selectedOverlayRef.current;
      if (!selDiv) return;
      selDiv.innerHTML = '';
      const pts: {pt: Pt, label: string}[] = [];
      if (ptA) pts.push({pt: ptA, label: 'A'});
      if (ptB) pts.push({pt: ptB, label: 'B'});
      for (const {pt, label} of pts) {
        const pos = project(pt, ss.camera, el);
        const d = document.createElement('div');
        d.style.cssText = `position:fixed;left:${pos.x}px;top:${pos.y}px;`
          + `width:13px;height:13px;border-radius:50%;`
          + `background:#00ccff;border:2px solid #ffffff;`
          + `transform:translate(-50%,-50%);`;
        selDiv.appendChild(d);
        const lbl = document.createElement('div');
        lbl.style.cssText = `position:fixed;left:${pos.x + 9}px;top:${pos.y - 9}px;`
          + `color:#00ccff;font-size:11px;font-weight:700;pointer-events:none;`
          + `text-shadow:0 0 3px #000;`;
        lbl.textContent = label;
        selDiv.appendChild(lbl);
      }
    };
    render();
    const unsub = ss.sceneRendered$.attach(render);
    return () => unsub();
  }, [ptA, ptB]);

  // Canvas interaction
  useEffect(() => {
    const ss  = ctx.viewer.sceneSetup;
    const el  = ss.renderer.domElement;
    let activeSnap: SnapPoint | null = null;

    const renderSnaps = (snaps: SnapPoint[], active: SnapPoint | null) => {
      const div = snapOverlayRef.current;
      if (!div) return;
      div.innerHTML = '';
      for (const s of snaps) {
        const pos = project(s, ss.camera, el);
        const isActive = active && s.x===active.x && s.y===active.y && s.z===active.z;
        const size = isActive ? 11 : 7;
        const bg = s.type==='center' ? (isActive?'#ffffff':'#cc88ff')
                 : s.type==='midpoint' ? (isActive?'#ffffff':'#aa66ff')
                 : (isActive?'#ffffff':'#9955ff');
        const d = document.createElement('div');
        d.style.cssText = `position:fixed;left:${pos.x}px;top:${pos.y}px;`
          + `width:${size}px;height:${size}px;border-radius:50%;`
          + `background:${bg};border:1.5px solid #ffffff;`
          + `transform:translate(-50%,-50%);`;
        div.appendChild(d);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const faceView = findFaceAt(ctx, e);
      if (!faceView) { renderSnaps([], null); activeSnap = null; return; }
      const snaps = getSnapsForFace(faceView.model.brepFace);
      activeSnap = nearestSnap(snaps, e.clientX, e.clientY, ss.camera, el);
      renderSnaps(snaps, activeSnap);
    };

    let mouseDownAt: {x:number,y:number} | null = null;
    const onMouseDown = (e: MouseEvent) => { mouseDownAt = {x:e.clientX, y:e.clientY}; };
    const onClick = (e: MouseEvent) => {
      if (!mouseDownAt) return;
      if (Math.hypot(e.clientX-mouseDownAt.x, e.clientY-mouseDownAt.y) > 5) return;
      if (!activeSnap) return;
      const pt = {x: activeSnap.x, y: activeSnap.y, z: activeSnap.z};
      if (!ptARef.current) {
        setPtA(pt);
      } else if (!ptBRef.current) {
        setPtB(pt);
      }
    };
    const onMouseLeave = () => { renderSnaps([], null); activeSnap = null; };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClick);
    el.addEventListener('mouseleave', onMouseLeave);
    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClick);
      el.removeEventListener('mouseleave', onMouseLeave);
      if (snapOverlayRef.current) snapOverlayRef.current.innerHTML = '';
    };
  }, []);

  const clear = () => { setPtA(null); setPtB(null); };

  let status = 'Hover a face — click a snap point';
  if (ptA && !ptB) status = 'Select second point';
  else if (ptA && ptB) status = '';

  return React.createElement(React.Fragment, null,
    React.createElement(MeasureLines, {ptA, ptB, showX, showY, showZ, showD}),
    React.createElement('div', {style:{padding:'6px 8px 4px',display:'flex',flexDirection:'column',gap:6}},
      React.createElement('div', {style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}},
        React.createElement(Toggle, {label:'D', color:'#00ccff', checked:showD, onChange:setShowD}),
        React.createElement(Toggle, {label:'X', color:'#ff6666', checked:showX, onChange:setShowX}),
        React.createElement(Toggle, {label:'Y', color:'#66ee66', checked:showY, onChange:setShowY}),
        React.createElement(Toggle, {label:'Z', color:'#6699ff', checked:showZ, onChange:setShowZ}),
      ),
      React.createElement('div', {style:{display:'flex',alignItems:'center'}},
        React.createElement('button', {onClick:clear, style:{marginRight:'auto'}}, 'Clear'),
        status && React.createElement('span', {style:{opacity:0.75,fontSize:12}}, status)
      )
    )
  );
}

export const MeasureAction: any = {
  id: 'MEASURE',
  label: 'Measure',
  icon: TbRuler,
  info: 'Measure distance between snap points on faces/edges',
  path: __dirname,
  paramsInfo: () => `(?)`,
  schema: measureSchema,
  form: MeasureForm,
  cancelLabel: 'Exit',
  hideOK: true,
  run: (_params: any, _ctx: ApplicationContext) => {
    return {created: [], consumed: []};
  },
};
