import * as OBC from 'openbim-components';

export class CullerUpdater {
	private _components?: OBC.Components;
	private _timer: any;
	private _time = 500;

	init(components: OBC.Components) {
		this._components = components;
	}

	cancel = () => {
		if (this._timer !== undefined) {
			clearTimeout(this._timer);
			this._timer = undefined;
		}
	};

	update = async () => {
		if(!this._components) return;
		this.cancel();
		const culler = await this._components.tools.get(OBC.ScreenCuller);
		this._timer = setTimeout(() => (culler.needsUpdate = true), this._time);
	};
}

const cullerUpdater = new CullerUpdater();
export {cullerUpdater}
