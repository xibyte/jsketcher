import {roundValueForPresentation as r} from "../operationHelper";
import {createWizardMetadata} from "./wizardMetadata";
import {createPreviewGeomProvider} from "./previewer";
import {Extrude} from "./cutExtrude";

export default {
  id: 'EXTRUDE',
  metadata: createWizardMetadata('height'),
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo:  value => `(${r(value)})`,
  previewGeomProvider: createPreviewGeomProvider(false),
  run: Extrude
};

