import * as OBC from "openbim-components";

export class ContextMenu {
    constructor(components: OBC.Components) {
        this.init(components);
    }

    private async init(components: OBC.Components) {
        const clipper = await components.tools.get(OBC.EdgesClipper);
        const dimensions = await components.tools.get(OBC.LengthMeasurement);

        const createPlaneButton = new OBC.Button(components);
        createPlaneButton.label = "Add plane";
        createPlaneButton.onClick.add(() => clipper.create());

        const deletePlaneButton = new OBC.Button(components);
        deletePlaneButton.label = "Delete plane";
        deletePlaneButton.onClick.add(() => clipper.delete());

        const createDimensionButton = new OBC.Button(components);
        createDimensionButton.label = "Create dimension";
        createDimensionButton.onClick.add(() => {
              dimensions.enabled = true;
              dimensions.create();
          }
        );

        const deleteDimensionButton = new OBC.Button(components);
        deleteDimensionButton.label = "Delete dimension";
        deleteDimensionButton.onClick.add(() => {
            const wasEnabled = dimensions.enabled;
            dimensions.enabled = true;
            dimensions.delete();
            dimensions.enabled = wasEnabled;
        });

        components.ui.contextMenu.addChild(
          createPlaneButton,
          deletePlaneButton,
          createDimensionButton,
          deleteDimensionButton
        );
    }
}