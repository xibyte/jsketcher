import * as OBC from "openbim-components";
import * as THREE from "three";
import {mainToolbarName} from "../types";
import { cullerUpdater } from '../src/culler-updater';

export class Initializer {
    private _components: OBC.Components;

    constructor(components: OBC.Components, container: HTMLDivElement) {
        this._components = components;
        this.init(components, container);
    }

    private async init(components: OBC.Components, container: HTMLDivElement) {
        const sceneComponent = new OBC.SimpleScene(components);
        components.scene = sceneComponent;

        const renderer = new OBC.PostproductionRenderer(components, container);
        components.renderer = renderer;

        const camera = new OBC.OrthoPerspectiveCamera(components);
        components.camera = camera;

        renderer.postproduction.enabled = true;

        components.raycaster = new OBC.SimpleRaycaster(components);
        await components.init();

        cullerUpdater.init(components);

        const gridColor = new THREE.Color(0x666666);
        const grid = new OBC.SimpleGrid(components, gridColor);
        grid.get().renderOrder = -1;

        if (renderer.postproduction.customEffects) {
            renderer.postproduction.customEffects.excludedMeshes.push(grid.get());
        }

        const mainToolbar = new OBC.Toolbar(components, {
            name: mainToolbarName,
            position: "bottom",
        });

        components.ui.addToolbar(mainToolbar);
        mainToolbar.addChild(camera.uiElement.get("main"));

        camera.controls.setLookAt(10, 10, 10, 0, 0, 0);

        camera.projectionChanged.add(() => {
            const projection = camera.getProjection();
            grid.fade = projection === "Perspective";
        });

        sceneComponent.setup();

        const navCube = await this._components.tools.get(OBC.CubeMap);
        navCube.setPosition("bottom-left");
        navCube.offset = 0.5;

        const fragments = new OBC.FragmentManager(components);

        const fragmentIfcLoader = new OBC.FragmentIfcLoader(components);

        fragmentIfcLoader.settings.wasm = {
            path: "https://unpkg.com/web-ifc@0.0.46/",
            absolute: true,
        };

        mainToolbar.addChild(fragmentIfcLoader.uiElement.get("main"));

        const classifier = new OBC.FragmentClassifier(components);

        const exploder = new OBC.FragmentExploder(components);
        mainToolbar.addChild(exploder.uiElement.get("main"));

        const clipper = await this._components.tools.get(OBC.EdgesClipper);
        clipper.enabled = true;
        // window.onkeydown = (event) => {
        //     if (event.code === 'KeyP') {
        //         clipper.create();
        //     }
        // };

        //@ts-ignore
        const culler = new OBC.ScreenCuller(components);
        const hider = new OBC.FragmentHider(components);
        mainToolbar.addChild(hider.uiElement.get("main"));

        const map = components.tools.get(OBC.MiniMap);
        const mapCanvas = map.uiElement.get("canvas");
        components.ui.add(mapCanvas);
        mapCanvas.domElement.style.bottom = "5rem";
        map.lockRotation = false;
        map.zoom = 0.2;
        map.frontOffset = 4;

        const dimensions = await this._components.tools.get(OBC.LengthMeasurement);

        window.addEventListener("keydown", (event) => {
            if(event.code === "Escape") {
                dimensions.cancelCreation();
                dimensions.enabled = false;
            }
        })

        const modelTree = new OBC.FragmentTree(components);
        await modelTree.init();

        mainToolbar.addChild(modelTree.uiElement.get("main"));

        const propsProcessor = new OBC.IfcPropertiesProcessor(components);
        mainToolbar.addChild(propsProcessor.uiElement.get("main"));

        const cacher = new OBC.FragmentCacher(components);

        const propsManager = new OBC.IfcPropertiesManager(components);
        propsManager.wasm = {
            path: "https://unpkg.com/web-ifc@0.0.46/",
            absolute: true
        }
        await propsManager.init();
        propsProcessor.propertiesManager = propsManager;

        propsManager.onRequestFile.add(async () => {
            propsManager.ifcToExport = null;
            if(!propsManager.selectedModel) return;
            const file = await cacher.get(propsManager.selectedModel.uuid);
            if(!file) return;
            propsManager.ifcToExport = await file.arrayBuffer();
        })

        const highlighter = await components.tools.get(OBC.FragmentHighlighter);
        await highlighter.setup();

        const plans = new OBC.FragmentPlans(components);
        mainToolbar.addChild(plans.uiElement.get("main"));

        const whiteColor = new THREE.Color("white");
        const whiteMaterial = new THREE.MeshBasicMaterial({color: whiteColor});
        const materialManager = new OBC.MaterialManager(components);
        materialManager.addMaterial("white", whiteMaterial);

        renderer.postproduction.customEffects.outlineEnabled = true;
        const styler = new OBC.FragmentClipStyler(components);

        await styler.setup();
        mainToolbar.addChild(styler.uiElement.get("mainButton"));

        renderer.get().domElement.addEventListener("wheel", cullerUpdater.update);
        camera.controls.addEventListener("controlstart", cullerUpdater.cancel);
        camera.controls.addEventListener("wake", cullerUpdater.cancel);
        camera.controls.addEventListener("controlend", cullerUpdater.update);
        camera.controls.addEventListener("sleep", cullerUpdater.update);

        highlighter.events.select.onClear.add(() => {
            propsProcessor.cleanPropertiesList();
        });

        highlighter.events.select.onHighlight.add((selection) => {
            const fragmentID = Object.keys(selection)[0];
            const firstID = Array.from(selection[fragmentID])[0];
            const expressID = Number(firstID);
            let model;
            for (const group of fragments.groups) {
                const fragmentFound = Object.values(group.keyFragments).find(
                  (id) => id === fragmentID
                );
                if (fragmentFound) {
                    model = group;
                }
            }
            if (model) {
                propsProcessor.renderProperties(model, expressID);
            }
        });

        let spacesVisible = true;
        const setSpacesVisibility = async (value: boolean) => {
            if (value === spacesVisible) return;
            spacesVisible = value;
            const spaces = await classifier.find({entities: ["IFCSPACE"]});
            await hider.set(value, spaces);
        }


        plans.onNavigated.add(() => {
            map.enabled = false;
            navCube.visible = false;
            renderer.postproduction.customEffects.glossEnabled = false;
            materialManager.setBackgroundColor(whiteColor);
            materialManager.set(true, ["white"]);
            grid.visible = false;
            setSpacesVisibility(false);
        });

        plans.onExited.add(() => {
            map.enabled = true;
            navCube.visible = true;
            renderer.postproduction.customEffects.glossEnabled = true;
            materialManager.resetBackgroundColor();
            materialManager.set(false, ["white"]);
            grid.visible = true;
            setSpacesVisibility(true);
        });
    }
}
