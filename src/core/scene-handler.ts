import {Scene} from './scene';

export const sceneHandler = {
    viewer: null as Scene | null,

    async start(container: HTMLDivElement) {
        if (!this.viewer) {
            this.viewer = new Scene(container);
        }
    },

    updateSettings(settings: any) {
        if (this.viewer) {
            this.viewer.updateSettings(settings);
        }
    },
};
