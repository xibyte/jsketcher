
export const REVOLVE = {
  icon: 'img/cad/revolve',
  label: 'Revolve',
  info: (p) => '(' + p.angle + ')',
  action: (app, params) => console.log(app, params)
};

export const SHELL = {
  icon: 'img/cad/shell',
  label: 'Shell',
  info: (p) => '(' + p.d + ')'
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
