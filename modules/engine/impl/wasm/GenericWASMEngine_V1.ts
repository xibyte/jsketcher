import {EngineAPI_V1} from "engine/api";
import {Vec3} from "math/vec";
import {Tessellation2D} from "engine/tessellation";
import {callEngine} from "engine/impl/wasm/interact";

export class GenericWASMEngine_V1 implements EngineAPI_V1 {

  boolean(params) {
    return callEngine(params, Module._SPI_boolean);
  }

  createBox(params) {
    return callEngine(params, Module._SPI_box);
  }

  createCone(params) {
    return callEngine(params, Module._SPI_cone);
  }

  createCylinder(params) {
    return callEngine(params, Module._SPI_cylinder);
  }

  createSphere(params) {
    return callEngine(params, Module._SPI_sphere);
  }

  createTorus(params) {
    return callEngine(params, Module._SPI_torus);
  }

  extrude(params) {
    return callEngine(params, Module._SPI_extrude);
  }

  fillet(params) {
    return callEngine(params, Module._SPI_fillet);
  }

  loft(params) {
    return callEngine(params, Module._SPI_loft);
  }

  loftPreview(params): Tessellation2D<Vec3> {
    return callEngine(params, Module._SPI_loftPreview) as Tessellation2D<Vec3>;
  }

  revolve(params) {
    return callEngine(params, Module._SPI_revolve);
  }

  splitFace(params) {
    return callEngine(params, Module._SPI_splitFace);
  }

  splitByPlane(params) {
    return callEngine(params, Module._SPI_splitByPlane);
  }

  defeatureFaces(params) {
    return callEngine(params, Module._SPI_defeatureFaces);
  }

  stepImport(params) {
    return callEngine(params, Module._SPI_stepImport);
  }

  loadModel(params) {
    return callEngine(params, Module._SPI_loadModel);
  }

  tessellate(params) {
    return callEngine(params, Module._SPI_tessellate);
  }

  transform(params) {
    return callEngine(params, Module._SPI_transform);
  }

  getLocation(params) {
    return callEngine(params, Module._SPI_getLocation);
  }

  setLocation(params) {
    return callEngine(params, Module._SPI_setLocation);
  }

  getModelData(params) {
    return callEngine(params, Module._SPI_getModelData);
  }

  dispose(params) {
    return callEngine(params, Module._SPI_dispose);
  }
}