import * as math from '../math/math'

export const CUT = {
  icon: 'img/3d/cut',
  label: 'Cut', 
  info: (p) => '(' + r(math.norm2(p.target)) + ')'
};

export const PAD = {
  icon: 'img/3d/extrude',
  label: 'Extrude',
  info: (p) => '(' + r(math.norm2(p.target)) + ')'
};

export const SHELL = {
  icon: 'img/3d/shell',
  label: 'Shell',
  info: (p) => '(' + p.d + ')'
};

export const BOX = {
  icon: 'img/3d/cube',
  label: 'Box',
  info: (p) => '(' + p.w + ', ' + p.h + ', ' + p.d + ')'
};

export const PLANE = {
  icon: 'img/3d/plane',
  label: 'Plane',
  info: (p) =>  '(' + p.depth + ')'
};

export const SPHERE = {
  icon: 'img/3d/sphere',
  label: 'Sphere',
  info: (p) => '(' + p.radius + ')'
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
  info: (p) => null
};

function r(value) {
  return value.toPrecision(4).replace(/\.0$/, '');
}