
export default {
  createBox: params => notImplemented,
  createSphere: params => notImplemented,
  createCone: params => notImplemented,
  createCylinder: params => notImplemented,
  createTorus: params => notImplemented,
  boolean: params =>  notImplemented,
  stepImport: params =>  notImplemented,
}

function notImplemented() {
  throw "engine doesn't support this operation"
}