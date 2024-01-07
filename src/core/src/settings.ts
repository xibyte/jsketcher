import * as OBC from "openbim-components";

export class Settings {
    private _components: OBC.Components;

    constructor(components: OBC.Components) {
        this._components = components;
    }

    async update(settings: any) {
        if(!settings) return;
        const tools = this._components.tools;

        if (settings.gridVisible !== undefined) {
            const grid = await tools.get(OBC.SimpleGrid);
            grid.visible = settings.gridVisible;
        }

        if (settings.viewCubeVisible !== undefined) {
            const cube = await tools.get(OBC.CubeMap);
            cube.visible = settings.viewCubeVisible;
        }

        if (settings.minimapVisible !== undefined) {
            const minimap = await tools.get(OBC.MiniMap);
            minimap.enabled = settings.minimapVisible;
        }

        if (settings.minimapZoom !== undefined) {
            console.log(settings.minimapZoom);
            // between 0.01 and 0.51
            const minimap = await tools.get(OBC.MiniMap);
            minimap.zoom = (settings.minimapZoom / 200) + 0.01;
        }

        if (settings.culling !== undefined) {
            const culler = await tools.get(OBC.ScreenCuller);
            culler.enabled = settings.culling;
        }

        const {postproduction} = this._components.renderer as OBC.PostproductionRenderer;

        if (settings.ambientOclussion !== undefined && postproduction.settings.ao !== settings.ambientOclussion) {
            postproduction.setPasses({ao: settings.ambientOclussion});
        }

        if (settings.glossiness !== undefined && postproduction.customEffects.glossEnabled !== settings.glossiness) {
            postproduction.customEffects.glossEnabled = settings.glossiness;
        }

        if (settings.outlines !== undefined && postproduction.settings.custom !== settings.outlines) {
            postproduction.setPasses({custom: settings.outlines});
        }

        const camera = this._components.camera as OBC.OrthoPerspectiveCamera;

        if (settings.zoomToCursor !== undefined) {
            camera.controls.dollyToCursor = settings.zoomToCursor;
        }

        if (settings.zoomBeyondTarget !== undefined) {
            camera.controls.infinityDolly = settings.zoomBeyondTarget;
        }

        if (settings.dragSpeed !== undefined) {
            camera.controls.truckSpeed = settings.dragSpeed / 40 + 0.01;
        }

        if (settings.zoomSpeed !== undefined) {
            camera.controls.dollySpeed = settings.zoomSpeed / 50 + 0.01;
        }

        const highlighter = await tools.get(OBC.FragmentHighlighter);

        if (settings.selectOutline !== undefined) {
            postproduction.customEffects.outlineEnabled = settings.selectOutline;
            highlighter.outlineEnabled = settings.selectOutline;
        }

        if (settings.selectFill !== undefined) {
            highlighter.fillEnabled = settings.selectFill;
        }

        if (settings.multiSelect !== undefined) {
            highlighter.multiple = settings.multiSelect;
        }

        if (settings.zoomToSelection !== undefined) {
            highlighter.zoomToSelection = settings.zoomToSelection;
        }
    }
}