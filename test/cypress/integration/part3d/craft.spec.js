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

import {defineCypressTest} from "../../../coreTests/defineCypress";

describe("Craft Operations", () => {
  defineCypressTest("Plane Operation", PlaneTests);
  defineCypressTest("Extrude - all sketcher objects", ExtrudeBasicShapesTests);
  defineCypressTest("Extrude Options", ExtrudeOptionsTests);
  defineCypressTest("Extrude Operation", ExtrudeTests);
  defineCypressTest("Cut Operation", CutTests);
  defineCypressTest("Revolve Operation", RevolveTests);
  defineCypressTest("Fillet Operation", FilletTests);
  defineCypressTest("Loft Operation", LoftTests);
  defineCypressTest("Datum Operation", DatumTests);
  defineCypressTest("General Boolean Operation", BooleanTests);
});



