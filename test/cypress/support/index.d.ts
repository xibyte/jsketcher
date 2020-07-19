declare namespace Cypress {
  interface Chainable {

    openModeller():  Chainable<Window>;
    getActionButton(actionId: string): Chainable<Element>;
    getMenu(menuId: string): Chainable<Element>;
    getActiveWizardField(fieldName: string): Chainable<Element>;
    selectRaycasting(from :vec3, to: vec3): Chainable<any>;
    simulateClickByRayCast(from :vec3, to: vec3): Chainable<any>;
    openSketcher(): Chainable<SketcherTPI>;
    commitSketch(): Chainable<void>;
    wizardOK(): Chainable<void>;
    getModellerTPI(): Chainable<ModellerTPI>;

    showEntitySelection(): Chainable<Element>;
    getEntitySelection(type: string): Chainable<Element>;

  }
  export interface ModellerTPI {
    wizardOK(): void;

  }

  export interface SketcherTPI {

    addRectangle(x1: number, y1: number, x2: number, y2: number): any;

    addCircle(x: number, y: number, r: number): any;
  }

  type vec3 = [number, number, number];
}


