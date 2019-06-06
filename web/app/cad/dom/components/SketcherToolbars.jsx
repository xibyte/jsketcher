import React from 'react';
import ls from './SketcherToolbars.less';
import {createPlugableToolbar} from './PlugableToolbar';

export default function SketcherToolbars({visible}) {
  return <div className={ls.sketcherToolbars}>
    <SketcherToolbarControl size='small'/>
    <SketcherToolbarConstraints size='medium' vertical/>
    <SketcherToolbarGeneral size='medium' vertical/>
  </div>;
}

const SketcherToolbarGeneral = createPlugableToolbar(streams => streams.ui.toolbars.sketcherGeneral);
const SketcherToolbarConstraints = createPlugableToolbar(streams => streams.ui.toolbars.sketcherConstraints);
const SketcherToolbarControl = createPlugableToolbar(streams => streams.ui.toolbars.sketcherControl);