// import {MESH_OPERATIONS} from './mesh/workbench'
// import {Extrude, Cut} from './brep/cut-extrude'
// import {Revolve} from './brep/revolve'
// import {BREPSceneSolid} from '../scene/wrappers/brepSceneObject'
// import {PlaneSceneObject} from '../scene/wrappers/planeSceneObject'
// import {box} from '../../brep/brep-primitives'

export const CUT = {
  icon: 'img/cad/cut',
  label: 'Cut',
  info: (p) => '(' + r(p.value) + ')',
  action: (app, params) => Cut(app, params)
};

export const EXTRUDE = {
  icon: 'img/cad/extrude',
  label: 'Extrude',
  info: (p) => '(' + r(p.value) + ')',
  action: (app, params) => Extrude(app, params)
};

export const REVOLVE = {
  icon: 'img/cad/revolve',
  label: 'Revolve',
  info: (p) => '(' + p.angle + ')',
  action: (app, params) => Revolve(app, params)
};

export const SHELL = {
  icon: 'img/cad/shell',
  label: 'Shell',
  info: (p) => '(' + p.d + ')'
};

export const BOX = {
  icon: 'img/cad/cube',
  label: 'Box',
  info: (p) => '(' + p.width + ', ' + p.height + ', ' + p.depth + ')',
  action: (app, request) => {
    return {
      outdated: [],
      created: [new BREPSceneSolid(box(request.width, request.height, request.depth))]
    }
  }
};

export const PLANE = {
  icon: 'img/cad/plane',
  label: 'Plane',
  info: (p) =>  '(' + p.depth + ')',
  action: (app, request) => {
    return {
      outdated: [],
      created: [PlaneSceneObject.create(request, (f) => app.findFace(f))]
    }
  }
};

export const SPHERE = {
  icon: 'img/cad/sphere',
  label: 'Sphere',
  info: (p) => '(' + p.radius + ')',
  action: (app, request) => {

  }
};

export const INTERSECTION = {
  icon: 'img/cad/intersection',
  label: 'Intersection',
  info: (p) => null
};

export const DIFFERENCE = {
  icon: 'img/cad/difference',
  label: 'Difference',
  info: (p) => null
};

export const UNION = {
  icon: 'img/cad/union',
  label: 'Union',
  info: (p) => null
};

export const IMPORT_STL = {
  icon: 'img/cad/stl',
  label: 'STL Import',
  info: (p) => '(' + p.url.substring(p.url.lastIndexOf('/') + 1 ) + ')',
  action: (app, request) => {

  }
};

function r(value) {
  return value.toPrecision(4).replace(/\.0$/, '');
}
