import React from 'react';
import ls from './SketcherToolbars.less';
import Abs from 'ui/components/Abs';
import {createPlugableToolbar} from './PlugableToolbar';
import connect from 'ui/connect';

export default connect(streams => streams.ui.toolbars.sketcherToolbarsVisible.map(visible => ({visible})))(
function SketcherToolbars({visible}) {
  if (!visible) {
    return null;
  }
  return <Abs left={5} top={5} className={ls.sketcherToolbars}>
    <SketcherToolbarGeneral small vertical/>
    <SketcherToolbarConstraints small vertical/>
    <SketcherToolbarControl small/>
  </Abs>;
})

const SketcherToolbarGeneral = createPlugableToolbar(streams => streams.ui.toolbars.sketcherGeneral);
const SketcherToolbarConstraints = createPlugableToolbar(streams => streams.ui.toolbars.sketcherConstraints);
const SketcherToolbarControl = createPlugableToolbar(streams => streams.ui.toolbars.sketcherControl);