import {IoMdSquareOutline} from 'react-icons/io';
import {BiNetworkChart, BiGridAlt} from 'react-icons/bi';
import {CgBorderAll, CgBorderStyleSolid} from 'react-icons/cg';
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
export const ViewFlagIsolinesAction = makeFlagAction('SURFACING_VIEW_ISOLINES', 'isolines', 'isolines', BiNetworkChart);
export const ViewFlagTessellationAction = makeFlagAction('SURFACING_VIEW_TESSELLATION', 'tessellation', 'tessellation', BiGridAlt);
export const ViewFlagEdgesAction = makeFlagAction('SURFACING_VIEW_EDGES', 'edges', 'edges', CgBorderAll);
export const ViewFlagBoundariesAction = makeFlagAction('SURFACING_VIEW_BOUNDARIES', 'boundaries', 'boundaries', CgBorderStyleSolid);
