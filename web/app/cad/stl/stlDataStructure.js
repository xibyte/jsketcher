export function StlSolid(name) {
  this.name = name;
  this.faces = [];
}

export function StlFace(normal) {
  this.normal = normal;
  this.vertices = [];
}