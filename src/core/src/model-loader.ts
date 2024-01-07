import * as OBC from 'openbim-components';
import { FragmentsGroup } from 'bim-fragment';
import { cullerUpdater } from './culler-updater';

export class ModelLoader {
	public _dragDrop: OBC.DragAndDropInput;
	private _components: OBC.Components;
	private _loadingModal: OBC.Modal;
	private _blurScreen: OBC.SimpleUIComponent;

	constructor(components: OBC.Components) {
		this._components = components;
		this._loadingModal = this.setupLoadingModal();
		this._blurScreen = this.setupBlurScreen();
		this._dragDrop = this.setupDragDrop();
	}

	private setupBlurScreen() {
		const blurScreen = new OBC.SimpleUIComponent(this._components);
		blurScreen.domElement.className = 'fixed top-0 bottom-0 right-0 left-0';
		blurScreen.domElement.style.backdropFilter = 'blur(5px)';
		blurScreen.domElement.style.zIndex = '999';
		this._components.ui.add(blurScreen);

		const canvas = this._components.renderer.get().domElement;
		canvas.addEventListener('dragenter', () => {
			blurScreen.visible = true;
		});

		return blurScreen;
	}

	private setupDragDrop() {
		const dragDrop = new OBC.DragAndDropInput(this._components);
		dragDrop.domElement.style.top = '8rem';
		dragDrop.domElement.style.bottom = '16rem';
		dragDrop.domElement.style.left = '12rem';
		dragDrop.domElement.style.right = '12rem';
		this._blurScreen.addChild(dragDrop);

		dragDrop.domElement.addEventListener('click', () => {
			// TODO: Add this click opening logic to the library
			const opener = document.createElement('input');
			opener.type = 'file';
			opener.multiple = true;
			opener.onchange = async () => {
				if(opener.files) {
					await this.openFiles(opener.files);
					opener.remove();
				}
			}
			opener.click();
		});

		dragDrop.onFilesLoaded.add(this.openFiles);

		return dragDrop;
	}

	private openFiles = async (files: FileList) => {
		if (files.length === 0) {
			return;
		}
		this._blurScreen.visible = false;
		const scene = this._components.scene.get();
		const cacher = await this._components.tools.get(OBC.FragmentCacher);
		const highlighter = await this._components.tools.get(OBC.FragmentHighlighter);
		const fragments = await this._components.tools.get(OBC.FragmentManager);

		// TODO: Why is this necessary? Investigate why the highlighter is reset
		if(!Object.keys(highlighter.highlightMats).length) {
			await highlighter.setup();
		}

		let fileLoaded = false;
		// @ts-ignore
		highlighter.enabled = false;

		for (const index in files) {
			const file = files[index];
			const { name, size } = file;

			if (!size || !name || !name.match(/.ifc$/)) {
				continue;
			}

			fileLoaded = true;
			this._loadingModal.visible = true;

			// If file is cached, just load the fragment

			const fileURL = URL.createObjectURL(file);

			const fileID = JSON.stringify({ name, size });
			const isCached = cacher.existsFragmentGroup(fileID);
			if (isCached) {
				const model = await cacher.getFragmentGroup(fileID);
				if (model) {
					// TODO: Do this in fragmentManager automatically?
					const isFirstModel = fragments.groups.length === 1;
					if (isFirstModel) {
						fragments.baseCoordinationModel = model.uuid;
					} else {
						fragments.coordinate([model]);
					}
					// Save the IFC for later export
					await cacher.delete([model.uuid]);
					await cacher.save(model.uuid, fileURL);
					await this.setupLoadedModel(model);
				}
				continue;
			}

			// Otherwise load the IFC and cache it


			const rawBuffer = await file.arrayBuffer();
			const buffer = new Uint8Array(rawBuffer);
			const loader = await this._components.tools.get(OBC.FragmentIfcLoader);
			const model = await loader.load(buffer, file.name);

			// Save the IFC for later export
			await cacher.delete([model.uuid]);
			await cacher.save(model.uuid, fileURL);

			await this.setupLoadedModel(model);

			if (!isCached) {
				await cacher.saveFragmentGroup(model, fileID);
			}

			scene.add(model);
		}

		// TODO: this is to prevent highlighting during load before coordination
		setTimeout(
			() => highlighter.enabled = true,
			1000
		)

		if(!fileLoaded) {
			this._blurScreen.visible = true;
			return;
		}
		this._loadingModal.visible = false;
	};


	private async setupLoadedModel(model: FragmentsGroup) {
		const tools = this._components.tools;
		const culler = await tools.get(OBC.ScreenCuller);
		const classifier = await tools.get(OBC.FragmentClassifier);
		const propsProcessor = await tools.get(OBC.IfcPropertiesProcessor);
		const highlighter = await tools.get(OBC.FragmentHighlighter);
		const grid = await tools.get(OBC.SimpleGrid);
		const styler = await tools.get(OBC.FragmentClipStyler);
		const plans = await tools.get(OBC.FragmentPlans);
		const materialManager = await tools.get(OBC.MaterialManager);
		const modelTree = await tools.get(OBC.FragmentTree);
		const hider = await tools.get(OBC.FragmentHider);

		for (const fragment of model.items) {
			culler.add(fragment.mesh);
		}

		classifier.byStorey(model);
		classifier.byEntity(model);

		await cullerUpdater.update();

		propsProcessor.process(model);
		await highlighter.update();

		const gridMesh = grid.get();
		const bottom = model.boundingBox.min.y;
		if (bottom < gridMesh.position.y) {
			gridMesh.position.y = bottom - 1;
		}

		await styler.update();

		await plans.computeAllPlanViews(model);
		await plans.updatePlansList();

		const meshes = model.items.map((frag: any) => frag.mesh);
		materialManager.addMeshes('white', meshes);
		await modelTree.update(['storeys', 'entities']);

		await hider.update();
	}

	private setupLoadingModal() {
		const loadingModal = new OBC.Modal(this._components, 'Loading model');
		this._components.ui.add(loadingModal);
		const modalContent = loadingModal.slots.actionButtons;
		for (const child of modalContent.children) {
			child.visible = false;
		}

		modalContent.domElement.classList.remove('justify-end');
		modalContent.domElement.classList.add('justify-start');

		const loadingMessage = '🚀 This should take a few moments...';
		const paragraph = `<p>${loadingMessage}</p>`;
		const text = new OBC.SimpleUIComponent(this._components, paragraph);
		loadingModal.slots.actionButtons.addChild(text);

		return loadingModal;
	}
}