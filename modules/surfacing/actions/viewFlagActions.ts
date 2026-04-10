import {IoMdSquareOutline} from 'react-icons/io';
import {BiNetworkChart} from 'react-icons/bi';
import {CgBorderAll} from 'react-icons/cg';
import {surfacingViewFlags$, toggleFlag, SurfacingViewFlags} from '../surfacingViewFlags';

function makeFlagAction(id: string, key: keyof SurfacingViewFlags, label: string, icon: any) {
  return {
    id,
    appearance: {
      label,
      info: `Toggle ${label} visibility`,
      icon,
    },
    invoke: (ctx: any) => {
      toggleFlag(key);
      ctx.services.viewer.requestRender();
    },
    listens: () => surfacingViewFlags$,
    update: (state: any, flags: SurfacingViewFlags) => {
      const on = flags[key];
      state.hint = on ? '\u2713 ' + label : label;
    },
  };
}

export const ViewFlagFacesAction = makeFlagAction('SURFACING_VIEW_FACES', 'faces', 'faces', IoMdSquareOutline);
export const ViewFlagMeshAction = makeFlagAction('SURFACING_VIEW_MESH', 'mesh', 'mesh', BiNetworkChart);
export const ViewFlagEdgesAction = makeFlagAction('SURFACING_VIEW_EDGES', 'edges', 'edges', CgBorderAll);
