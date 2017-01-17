import {MESH_OPERATIONS} from './mesh/workbench'
import {Extrude, Cut} from './brep/cut-extrude'

export const CUT = {
  icon: 'img/3d/cut',
  label: 'Cut',
  info: (p) => '(' + r(p.value) + ')',
  action: (app, params) => Cut(app, params)
};

export const PAD = {
  icon: 'img/3d/extrude',
  label: 'Extrude',
  info: (p) => '(' + r(p.value) + ')',
  action: (app, request) => {

  }
};

export const REVOLVE = {
  icon: 'img/3d/revolve',
  label: 'Revolve',
  info: (p) => '(' + p.angle + ')',
  action: (app, request) => {

  }
};

export const SHELL = {
  icon: 'img/3d/shell',
  label: 'Shell',
  info: (p) => '(' + p.d + ')'
};

export const BOX = {
  icon: 'img/3d/cube',
  label: 'Box',
  info: (p) => '(' + p.w + ', ' + p.h + ', ' + p.d + ')',
  action: (app, request) => {

  }
};

export const PLANE = {
  icon: 'img/3d/plane',
  label: 'Plane',
  info: (p) =>  '(' + p.depth + ')',
  action: (app, request) => {

  }
};

export const SPHERE = {
  icon: 'img/3d/sphere',
  label: 'Sphere',
  info: (p) => '(' + p.radius + ')',
  action: (app, request) => {

  }
};

export const INTERSECTION = {
  icon: 'img/3d/intersection',
  label: 'Intersection',
  info: (p) => null
};

export const DIFFERENCE = {
  icon: 'img/3d/difference',
  label: 'Difference',
  info: (p) => null
};

export const UNION = {
  icon: 'img/3d/union',
  label: 'Union',
  info: (p) => null
};

export const IMPORT_STL = {
  icon: 'img/3d/stl',
  label: 'STL Import',
  info: (p) => '(' + p.url.substring(p.url.lastIndexOf('/') + 1 ) + ')',
  action: (app, request) => {

  }
};

function r(value) {
  return value.toPrecision(4).replace(/\.0$/, '');
}
