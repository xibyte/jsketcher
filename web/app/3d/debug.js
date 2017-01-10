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
  window.__DEBUG__ = {
    AddLine: (a, b) => {
      app.viewer.workGroup.add(createLine(a, b));
      app.viewer.render();
    },
    AddPoint: (coordinates, or, vector) => {
      app.viewer.workGroup.add(createPoint(coordinates, or, vector));
      app.viewer.render();
    }
  };
}

function createLine(a, b) {
  const debugLineMaterial = new THREE.LineBasicMaterial({color: 0xFA8072, linewidth: 3});
  const  lg = new THREE.Geometry();
  lg.vertices.push(a.three());
  lg.vertices.push(b.three());
  return new THREE.Line(lg, debugLineMaterial);
}

function createPoint(x, y, z) {
  if (!y) {
    y = x.y;
    z = x.z;
    x = x.x;
  }
  var geometry = new THREE.SphereGeometry( 5, 16, 16 );
  var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
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
    actions: [ 'DebugPrintAllSolids', 'DebugPrintFace', 'DebugFaceId']
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
  }
};
