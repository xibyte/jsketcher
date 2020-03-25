/// <reference types="cypress" />

import * as PlaneTests from '../../../coreTests/testCases/craftPlane';
import * as ExtrudeBasicShapesTests from '../../../coreTests/testCases/craftExtrudeBasicShapes';
import * as ExtrudeOptionsTests from '../../../coreTests/testCases/craftExtrudeOptions';
import * as ExtrudeTests from '../../../coreTests/testCases/craftExtrude';
import * as CutTests from '../../../coreTests/testCases/craftCut';
import * as RevolveTests from '../../../coreTests/testCases/craftRevolve';
import * as FilletTests from '../../../coreTests/testCases/craftFillet';
import * as LoftTests from '../../../coreTests/testCases/craftLoft';
import * as DatumTests from '../../../coreTests/testCases/craftDatum';
import * as BooleanTests from '../../../coreTests/testCases/craftBoolean';

import {defineCypressTests} from "../../../coreTests/defineCypress";

describe("Craft Operations", () => {
  defineCypressTests("Plane Operation", PlaneTests);
  defineCypressTests("Extrude - all sketcher objects", ExtrudeBasicShapesTests);
  defineCypressTests("Extrude Options", ExtrudeOptionsTests);
  defineCypressTests("Extrude Operation", ExtrudeTests);
  defineCypressTests("Cut Operation", CutTests);
  defineCypressTests("Revolve Operation", RevolveTests);
  defineCypressTests("Fillet Operation", FilletTests);
  defineCypressTests("Loft Operation", LoftTests);
  defineCypressTests("Datum Operation", DatumTests);
  defineCypressTests("General Boolean Operation", BooleanTests);
});



