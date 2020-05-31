
describe("Part Import", () => {

  beforeEach(() => {
    cy.openModeller();
  });

  it("import from web-cad.org smoke test", () => {
    cy.getActionButton('IMPORT_PART').click();
    cy.get('.wizard').should('have.attr', 'data-operation-id', 'IMPORT_PART');

  });
});
