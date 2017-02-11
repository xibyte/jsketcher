import {checkForSelectedFaces} from './actions/action-helpers'

export const DEBUG = true;

export function AddDebugSupport(app) {
  if (!DEBUG) return;
  app.actionManager.registerActions(DebugActions);
  app.ui.registerMenuActions(DebugMenuConfig);
  app.controlBar.add('menu.debug', true);
  addGlobalDebugActions(app);
}

function addGlobalDebugActions(app) {
  const debugGroup = new THREE.Object3D();
  app.viewer.workGroup.add(debugGroup);
  window.__DEBUG__ = {
    AddLine: (a, b) => {
      debugGroup.add(createLine(a, b));
      app.viewer.render();
    },
    AddSegment: (a, b, color) => {
      debugGroup.add(createLine(a, b, color));
      debugGroup.add(createPoint(a, 0x000088));
      debugGroup.add(createPoint(b, 0x880000));
      app.viewer.render();
    },
    AddPoint: (coordinates, or, vector, andColorAtTheEnd) => {
      debugGroup.add(createPoint(coordinates, or, vector, andColorAtTheEnd));
      app.viewer.render();
    },
    AddVertex: (v) => {
      window.__DEBUG__.AddPoint(v.point);
    },
    AddHalfEdge: (he, color) => {
      window.__DEBUG__.AddSegment(he.vertexA.point, he.vertexB.point, color);
    },
    AddFace: (face, color) => {
      for (let e of face.edges) __DEBUG__.AddHalfEdge(e, color);
    },
    AddVolume: (shell, color) => {
      app.addShellOnScene(shell, {
        color,
        transparent: true,
        opacity: 0.5,
      });
    },
    HideSolids: () => {
      app.findAllSolids().forEach(s => s.cadGroup.traverse(o => o.visible = false));
      app.viewer.render();
    },
    Clear: () => {
        while (debugGroup.children.length) debugGroup.remove(debugGroup.children[0]);
        app.viewer.render();
      }
    }
}

function createLine(a, b, color) {
  color = color || 0xFA8072;
  const debugLineMaterial = new THREE.LineBasicMaterial({color, linewidth: 3});
  const  lg = new THREE.Geometry();
  lg.vertices.push(a.three());
  lg.vertices.push(b.three());
  return new THREE.Line(lg, debugLineMaterial);
}

function createPoint(x, y, z, color) {
  if (!z) {
    color = y;
    y = x.y;
    z = x.z;
    x = x.x;
  }
  color = color || 0x00ff00;
  var geometry = new THREE.SphereGeometry( 5, 16, 16 );
  var material = new THREE.MeshBasicMaterial( {color} );
  var sphere = new THREE.Mesh(geometry, material);
  sphere.position.x = x;
  sphere.position.y = y;
  sphere.position.z = z;
  return sphere;
}

const DebugMenuConfig = {
  debug: {
    label: 'debug',
    cssIcons: ['bug'],
    info: 'set of debug actions',
    actions: [ 'DebugPrintAllSolids', 'DebugPrintFace', 'DebugFaceId', 'DebugFaceSketch']
  }
};

const DebugActions = {
  'DebugPrintAllSolids': {
    cssIcons: ['cutlery'],
    label: 'print all solids',
    info: 'print all solids from the proejct as JSON',
    invoke: (app) => {
      app.findAllSolids().map(function (o) {
        console.log("Solid ID: " + o.tCadId);
        console.log(JSON.stringify(o.csg));
      });
    }
  },

  'DebugPrintFace': {
    cssIcons: ['cutlery'],
    label: 'print face',
    info: 'print a face out as JSON',
    listens: ['selection'],
    update: checkForSelectedFaces(1),
    invoke: (app) => {
      var s = app.viewer.selectionMgr.selection[0];
      console.log(JSON.stringify({
        polygons: s.csgGroup.polygons,
        basis: s._basis
      }));
    }
  },

  'DebugFaceId': {
    cssIcons: ['cutlery'],
    label: 'print face id',
    info: 'print a face id',
    listens: ['selection'],
    update: checkForSelectedFaces(1),
    invoke: (app) => {
      console.log(app.viewer.selectionMgr.selection[0].id);
    }
  },
  
  'DebugFaceSketch': {
    cssIcons: ['cutlery'],
    label: 'print face sketch',
    info: 'print face sketch stripping constraints and boundary',
    listens: ['selection'],
    update: checkForSelectedFaces(1),
    invoke: (app) => {
      const faceId = app.viewer.selectionMgr.selection[0].id;
      const sketch = JSON.parse(localStorage.getItem(app.faceStorageKey(faceId)));
      const layers = sketch.layers.filter(l => l.name != '__bounds__');
      const data = [];
      for (let l of layers) {
        for (let d of l.data) {
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
  }
};
