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


  beforeEach(() => {
    cy.openModeller();
  });

  // afterEach(() => {
  //   cy.screenshot();
  // });

  it("plane wizard should open", () => {
    cy.getActionButton('PLANE').click();
    cy.get('.wizard').should('have.attr', 'data-operation-id', 'PLANE');
    cy.getActiveWizardField('depth').find('input').type('100');
    cy.get('.wizard .dialog-ok').click();
    cy.selectRaycasting([-119, 29, 167], [23, -15, 33])
  });

  it("extrube wizard should work", () => {
    cy.getActionButton('PLANE').click();
    cy.get('.wizard').should('have.attr', 'data-operation-id', 'PLANE');
    cy.getActiveWizardField('depth').find('input').type('100');
    cy.get('.wizard .dialog-ok').click();
    cy.selectRaycasting([-119, 29, 167], [23, -15, 33]);
    cy.openSketcher().then(sketcher => {
      sketcher.addRectangle(0, 0, 80, 100);
      cy.commitSketch();
    });
    cy.getActionButton('EXTRUDE').click();
    cy.get('.wizard .dialog-ok').click();
    cy.selectRaycasting([-18, 67, 219], [120, 25, 81]);
    cy.get('.float-view-btn[data-view="selection"]').click();
    cy.get('.selection-view [data-entity="face"] li').should('have.text', 'S:1/F:5');

  });

  it.only("move datum", () => {
    createDatum();
    cy.simulateClickByRayCast([10, 15, 76], [154, -25, -56]);
    cy.getMenu('datum').within(() => {
      cy.getActionButton('DATUM_ROTATE').click()
    })


  });

});

function createDatum() {

  cy.get('[info="originates a new datum from origin or off of a selected face"]').click();
  cy.get('.x-Field-active > .number > input').type("100");

  cy.get('.accent').click();
}

