import {checkForSelectedFaces} from './actions/actionHelpers';
import {brepFaceToGeom, createSolidMaterial, surfaceToThreeGeom, tessDataToGeom} from './scene/views/viewUtils';
import DPR from 'dpr';
import Vector from 'math/vector';
import * as vec from 'math/vec';
import React from 'react';
import {readSketchFloat} from './sketch/sketchReader';
import {toLoops} from 'brep/io/brepLoopsFormat';
import curveTess from 'geom/impl/curve/curve-tess';
import {LOG_FLAGS} from './logFlags';
import {state} from "lstream";

export const BundleName = "@Debug";

const BREP_DEBUG_WINDOW_VISIBLE$ = state(false);

export function activate(ctx) {
  const {services, streams} = ctx;
  addGlobalDebugActions(services);
  addDebugSelectors(services);
  ctx.actionService.registerActions(DebugActions);
  services.menu.registerMenus([DebugMenuConfig]);
  services.debug = {
    LOG_FLAGS,
    utils: window.__DEBUG__
  };
  streams.ui.controlBars.left.update(actions => [...actions, 'menu.debug']);
  
  // contributeComponent(<BrepDebuggerWindow key='debug.BrepDebuggerWindow' auxGroup={services.cadScene.auxGroup} />);
}

function addGlobalDebugActions({viewer, cadScene, cadRegistry}) {
  const debugGroup = new THREE.Object3D();
  const debugVolumeGroup = new THREE.Object3D();

  cadScene.auxGroup.add(debugGroup);
  cadScene.auxGroup.add(debugVolumeGroup);
  window.__DEBUG__ = {
    flag: 0, 
    AddLine: (a, b) => {
      debugGroup.add(createLine(a, b));
      viewer.render();
    },
    AddSegment: (a, b, color) => {
      __DEBUG__.AddPolyLine([a, b], color);
    },
    AddSegment3: (a, b, color) => {
      __DEBUG__.AddPolyLine3([a, b], color);
    },    
    AddPolyLine3: (points, color) => {
      __DEBUG__.AddPolyLine(points.map(p => new Vector().set3(p)), color);
    },
    AddPolyLine: (points, color) => {
      for (let i = 1; i < points.length; ++i) {
        debugGroup.add(createLine(points[i - 1], points[i], color));
      }
      debugGroup.add(createPoint(points[0], 0x000088));
      debugGroup.add(createPoint(points[points.length - 1], 0x880000));
      viewer.render();
    },
    AddPoint: (coordinates, or, vector, andColorAtTheEnd) => {
      debugGroup.add(createPoint(coordinates, or, vector, andColorAtTheEnd));
      viewer.render();
    },
    AddPoint3: (arr, color) => {
      __DEBUG__.AddPoint(arr[0], arr[1], arr[2], color);
    },
    AddVertex: (v) => {
      window.__DEBUG__.AddPoint(v.point);
    },
    AddPolygon: (vertices, color) => {
      for (let i = 0; i < vertices.length; i ++) {
        __DEBUG__.AddSegment(vertices[i].point, vertices[(i + 1) % vertices.length].point, color);
      }  
    },
    AddPointPolygon: (points, color) => {
      for (let i = 0; i < points.length; i ++) {
        __DEBUG__.AddSegment(points[i], points[(i + 1) % points.length], color);
      }
    },

    AddPointPolygons: (polygons, color) => {
      for (const points of polygons) {
        for (let i = 0; i < points.length; i ++) {
          debugGroup.add(createLine(points[i], points[(i + 1) % points.length], color));
        }
      }
      viewer.render();
    },

    AddPlane: (plane) => {
      const geo = new THREE.PlaneBufferGeometry(2000, 2000, 8, 8);
      const coplanarPoint = plane.normal.multiply(plane.w);
      const focalPoint = coplanarPoint.plus(plane.normal);
      geo.lookAt(focalPoint.three());
      geo.translate(coplanarPoint.x, coplanarPoint.y, coplanarPoint.z);
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3, });
      const planeObj = new THREE.Mesh(geo, mat);
      debugGroup.add(planeObj);
      viewer.render();
    },
    AddHalfEdge: (he, color) => {
      const points = he.edge.curve.tessellate();
      if (he.inverted) {
        points.reverse();
      }
      window.__DEBUG__.AddPolyLine(points, color);  
    },
    AddFace: (face, color) => {
      for (const e of face.edges) __DEBUG__.AddHalfEdge(e, color);
    },
    AddLoop: (loop, color) => {
      for (const e of loop.halfEdges) __DEBUG__.AddHalfEdge(e, color);
    },
    AddVolume: (shell, color) => {
      color = color || 0xffffff;
      // const geometry = new THREE.Geometry();
      shell.faces.forEach(f => {
        const geometry = brepFaceToGeom(f,)

        const mesh = new THREE.Mesh(geometry, createSolidMaterial({
          color,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          depthTest: false
        }));
        debugVolumeGroup.add(mesh);

      });
      // window.__DEBUG__.AddWireframe(shell, color);
      viewer.render();
    },
    AddWireframe: (shell, color) => {
      color = color || 0xffffff;
      const visited = new Set();
      for (const e of shell.edges) {
        const vertices = []
        vertices.push(e.halfEdge1.vertexA.point.three());
        vertices.push(e.halfEdge2.vertexA.point.three());

        const lg = new THREE.BufferGeometry().setFromPoints( vertices );

        const line = new THREE.Line(lg, new THREE.LineBasicMaterial({color, linewidth: 3/DPR}));
        debugVolumeGroup.add(line);
      }
      viewer.render();
    },
    AddParametricSurface: (srf, color) => {
      color = color || 0xffffff;
      const geometry = surfaceToThreeGeom(srf);
      const mesh = new THREE.Mesh(geometry, createSolidMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      }));
      debugVolumeGroup.add(mesh);
      viewer.render();
    },
    AddCurve: (curve, color, scale) => {
      __DEBUG__.AddPolyLine( curve.tessellate(undefined, scale), color);
    },
    AddParametricCurve: (curve, color, scale) => {
      const [uMin, uMax] = curve.domain();
      __DEBUG__.AddPolyLine3(curveTess(curve, uMin, uMax, undefined, scale), color);
    },
    AddVerbCurve: (curve, color) => {
      __DEBUG__.AddPolyLine(curve.tessellate().map(p => new Vector().set3(p)), color);
    },
    AddSurfaceCorners: (srf) => {
      __DEBUG__.AddPoint(srf.southWestPoint(), 0xff0000);
      __DEBUG__.AddPoint(srf.southEastPoint(), 0x00ff00);
      __DEBUG__.AddPoint(srf.northEastPoint(), 0x0000ff);
      __DEBUG__.AddPoint(srf.northWestPoint(), 0x00ffff);
    },
    AddNormal: (atPoint, normal, color, scale) => {
      scale = scale || 100;
      __DEBUG__.AddSegment(atPoint, atPoint.plus(normal.multiply(scale)), color);
    },
    AddNormal3: (atPoint, normal, color, scale) => {
      scale = scale || 100;
      __DEBUG__.AddSegment3(atPoint, vec.add(atPoint, vec.mul(normal, scale)), color);
    },
    AddSurfaceNormal: (surface) => {     
      __DEBUG__.AddNormal(surface.pointInMiddle(), surface.normalInMiddle());
    },
    AddCSys: (csys, scale) => {
      scale = scale || 100;
      __DEBUG__.AddNormal(csys.origin, csys.x, 0xff0000, scale)
      __DEBUG__.AddNormal(csys.origin, csys.y, 0x00ff00, scale)
      __DEBUG__.AddNormal(csys.origin, csys.z, 0x0000ff, scale)
    },
    AddTessDump: (triangles, color) => {
      const vec = arr => new THREE.Vector3().fromArray(arr);
      color = color || 0xffffff;

      const geometry = tessDataToGeom(triangles);
      const mesh = new THREE.Mesh(geometry, createSolidMaterial({
        vertexColors: THREE.FaceColors,
        color: 0xB0C4DE,
        shininess: 0,
        side: THREE.DoubleSide
      }));
      debugVolumeGroup.add(mesh);
      viewer.render();
    },
    AddFacesTessellation: (faces) => {
      const dump = [];
      faces.forEach(face => {

        for (let i = 0; i < face.indices.length; i += 3) {

          const a = (face.indices[i + 0] - 1) * 3;
          const b = (face.indices[i + 1] - 1) * 3;
          const c = (face.indices[i + 2] - 1) * 3;

          dump.push([
            [
              face.positions[a + 0],
              face.positions[a + 1],
              face.positions[a + 2]
            ],
            [
              face.positions[b + 0],
              face.positions[b + 1],
              face.positions[b + 2]
            ],
            [
              face.positions[c + 0],
              face.positions[c + 1],
              face.positions[c + 2]
            ],
          ]);
        }

      })
      __DEBUG__.AddTessDump(dump);
      viewer.render();
    },
    HideSolids: () => {
      cadRegistry.getAllShells().forEach(s => s.ext.view.mesh.traverse(o => o.visible = false));
      viewer.render();
    },
    ShowSolids: () => {
      cadRegistry.getAllShells().forEach(s => s.ext.view.mesh.traverse(o => o.visible = true));
      viewer.render();
    },
    Clear: () => {
      clearGroup(debugGroup);
      viewer.render();
    },
    ClearVolumes: () => {
      clearGroup(debugVolumeGroup);
      viewer.render();
    },
    render: () => viewer.render()
  }
}

function clearGroup(g) {
  while (g.children.length) {
    const o = g.children[0];
    o.material.dispose();
    o.geometry.dispose();
    g.remove(o);
  }
}

export function createLine(a, b, color) {
  color = color || 0xFA8072;
  const debugLineMaterial = new THREE.LineBasicMaterial({color, linewidth: 10});
  const vertices = [a.three(), b.three()];
  const lg = new THREE.BufferGeometry().setFromPoints( vertices );
  return new THREE.Line(lg, debugLineMaterial);
}

export function createPoint(x, y, z, color) {
  if (z === undefined) {
    color = y;
    y = x.y;
    z = x.z;
    x = x.x;
  }
  color = color || 0x00ff00;
  const geometry = new THREE.SphereGeometry( 5, 16, 16 );
  const material = new THREE.MeshBasicMaterial( {color} );
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.x = x;
  sphere.position.y = y;
  sphere.position.z = z;
  return sphere;
}

const DebugMenuConfig = {
  id: 'debug',
  label: 'debug',
  cssIcons: ['bug'],
  info: 'set of debug actions',
  actions: ['DebugPrintAllSolids', 'DebugPrintFace', 'DebugFaceId', 'DebugFaceSketch', 
    'DebugSetSketcherIntegerPrecision', 'DebugOpenLastTest', 'DebugOpenBrepDebugger']
};

const DebugActions = [
  {
    id: 'DebugPrintAllSolids',
    appearance: {
      cssIcons: ['cutlery'],
      label: 'print all solids',
      info: 'print all solids from the proejct as JSON'
    },
    invoke: ({services:{cadRegistry}}) => {
      cadRegistry.getAllShells().map(function (o) {
        console.log("Solid ID: " + o.tCadId);
      });
    }
  },

  {
    id: 'DebugPrintFace',
    appearance: {
      cssIcons: ['cutlery'],
      label: 'print face',
      info: 'print a face out as JSON',
    },
    listens: ctx => ctx.streams.selection.face,
    update: checkForSelectedFaces(1),
    invoke: ({services: {selection}}) => {
      const s = selection.face.single;
      console.log(JSON.stringify({
        polygons: s.csgGroup.polygons,
        basis: s._basis
      }));
    }
  },

  {
    id: 'DebugFaceId',
    appearance: {
      cssIcons: ['cutlery'],
      label: 'print face id',
      info: 'print a face id',
    },
    listens: ctx => ctx.streams.selection.face,
    update: checkForSelectedFaces(1),
    invoke: ({services: {selection}}) => {
      console.log(selection.face.single.id);
    }
  },
  
  {
    id: 'DebugFaceSketch',
    appearance: {
      cssIcons: ['cutlery'],
      label: 'print face sketch',
      info: 'print face sketch stripping constraints and boundary',
    },
    listens: ctx => ctx.streams.selection.face,
    update: checkForSelectedFaces(1),
    invoke: ({services: {selection, project}}) => {
      const faceId = selection.face.single.id;
      const sketch = JSON.parse(localStorage.getItem(project.faceStorageKey(faceId)));
      const layers = sketch.layers.filter(l => l.name !== '__bounds__');
      const data = [];
      for (const l of layers) {
        for (const d of l.data) {
          data.push(d);
        }
      }
      const squashed = {
        layers: [{
            name: 'sketch',
            data
          }]
      };
      console.log(JSON.stringify(squashed));
    }
  },
  {
    id: 'DebugSetSketcherIntegerPrecision',
    appearance: {
      cssIcons: ['gear'],
      label: 'set sketch precision to 0(integer)',
      info: 'all points and other parameters from sketches will be rounded to integer, useful for creating topological tests',
    },
    invoke: () => {
      let url = window.location.href;
      if (url.indexOf('sketchPrecision') !== -1) {
        url = url.replace(/sketchPrecision=\d+/, 'sketchPrecision=0');  
      } else {
        if (url.indexOf('?') !== -1) {
          url += '&';
        } else {
          url += '?';
        }
        url += 'sketchPrecision=0';
      }
      window.location.href = url;
    }
  },
  {
    id: 'DebugOpenLastTest',
    appearance: {
      cssIcons: ['gear'],
      label: 'open last test',
      info: 'open test project with the data generated by the latest executed unit test',
    },
    invoke: () => {
      window.location.href = '/index.html?$$$__test__$$$';
    }
  },
  {
    id: 'DebugOpenBrepDebugger',
    appearance: {
      cssIcons: ['cubes'],
      label: 'open BREP debugger',
      info: 'open the BREP debugger in a window',
    },
    invoke: ({bus}) => {
      BREP_DEBUG_WINDOW_VISIBLE$.next(true);
    }
  }

];

function addDebugSelectors(services) {
  window.$f = services.cadRegistry.findFace;
  window.$e = services.cadRegistry.findEdge;
}