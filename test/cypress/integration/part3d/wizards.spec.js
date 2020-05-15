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

describe("Wizrds", () => {


  afterEach(() => {
    cy.screenshot();
  });

  it("plane wizrd should open", () => {
    createDatum();


  });

  it("move datum", () => {
    createDatum();

  });

});

function createDatum() {
  cy.visit("http://localhost:3000");
  cy.get('[info="originates a new datum from origin or off of a selected face"]').click();
  cy.get('.x-Field-active > .number > input').type("100");

  cy.get('.accent').click();
}

