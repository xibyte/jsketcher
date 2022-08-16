/* eslint @typescript-eslint/ban-types: 0 */

declare let Module: {
  _SPI_box: Function;
  _SPI_torus: Function;
  _SPI_sphere: Function;
  _SPI_cylinder: Function;
  _SPI_cone: Function;
  _SPI_boolean: Function,
  _SPI_extrude: Function;
  _SPI_stepImport: Function;
  _SPI_revolve: Function;
  _SPI_splitFace: Function;
  _SPI_splitByPlane: Function;
  _SPI_defeatureFaces: Function;
  _SPI_loftPreview: Function;
  _SPI_loft: Function;
  _SPI_fillet: Function;
  _SPI_loadModel: Function;
  _SPI_tessellate: Function;
  _SPI_transform: Function;
  _SPI_getLocation: Function;
  _SPI_setLocation: Function;
  _SPI_getModelData: Function;
  _SPI_dispose: Function;

  _InitCommands: Function;
  _GetRef: Function;
  _GetProductionHistory: Function;
  _ClassifyPointToFace: Function;
  onRuntimeInitialized: Function;
  instantiateWasm: Function;
};
