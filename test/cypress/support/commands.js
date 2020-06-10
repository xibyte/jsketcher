import 'cypress-wait-until';
import modellerUISubject from "../../coreTests/subjects/modellerTPI";


Cypress.Commands.add("openModeller", () => {
  return cy.visit("http://localhost:3000?test&LOG.PICK=true");
});


Cypress.Commands.add("getActionButton", (actionId) => {
  return cy.get(`[data-action-id='${actionId}']`);
});

Cypress.Commands.add("getMenu", (menuId) => {
  return cy.get(`[data-menu-id='${menuId}']`);
});

Cypress.Commands.add("getActiveWizardField", (fieldName) => {

  return cy.get(`.wizard [data-field-name='${fieldName}']`);

});

Cypress.Commands.add("selectRaycasting", (from, to) => {
  return cy.window().then(win => {
    win.__CAD_APP.services.pickControl.simulatePickFromRay(from, to);
    win.__DEBUG__.AddSegment3(from, to);
  });
});

Cypress.Commands.add("simulateClickByRayCast", (from, to) => {
  cy.getModellerTPI().then(tpi => {
    tpi.simulateClickByRayCast(from, to);
    tpi.__DEBUG__.AddSegment3(from, to);
  });

});

Cypress.Commands.add("openSketcher", () => {
  return cy.getModellerTPI().then(tpi => tpi.openSketcher());
});

Cypress.Commands.add("commitSketch", () => {
  return cy.getModellerTPI().then(tpi => tpi.commitSketch());
});


Cypress.Commands.add("wizardOK", () => {
  cy.getModellerTPI().then(tpi => tpi.wizardOK())
});

Cypress.Commands.add("getModellerTPI", () => {
  return cy.window().then(win => modellerUISubject(win.__CAD_APP));
});

Cypress.Commands.add("showEntitySelection", () => {
  return cy.get('.float-view-btn[data-view="selection"]').click();
});

Cypress.Commands.add("getEntitySelection", (type) => {
  return cy.get(`.selection-view [data-entity="${type}"] li`);
});


