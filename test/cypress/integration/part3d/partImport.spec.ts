
describe("Part Import", () => {

  beforeEach(() => {
    cy.openModeller();
  });

  it("import from web-cad.org basic flow", () => {
    cy.getActionButton('IMPORT_PART').click();
    cy.get('.wizard').should('have.attr', 'data-operation-id', 'IMPORT_PART');

    cy.get('.part-catalog-chooser').should('exist');
    cy.get('.part-catalog-chooser [data-part-ref="web-cad.org/primitives.box"]').click();
    cy.wizardOK();
    cy.simulateClickByRayCast([-84, 242, 415], [84, 232, 307]);

    cy.showEntitySelection();
    cy.getEntitySelection('face').should('have.text', 'web-cad.org/primitives.box:0:S:0/F:0');

  });

  it("should refer to right face while extrude operation of external part", () => {
    cy.getActionButton('IMPORT_PART').click();
    cy.get('.wizard').should('have.attr', 'data-operation-id', 'IMPORT_PART');

    cy.get('.part-catalog-chooser').should('exist');
    cy.get('.part-catalog-chooser [data-part-ref="web-cad.org/lumber.2x4"]').click();
    cy.wizardOK();
    cy.simulateClickByRayCast([-84, 242, 415], [84, 232, 307]);

    cy.showEntitySelection();
    cy.getEntitySelection('face').should('have.text', 'web-cad.org/lumber.2x4:0:S:2/F:0');

  });

});
