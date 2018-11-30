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
  return <Abs right={0} className={ls.sketcherToolbars}>
    <SketcherToolbarControl size='small'/>
    <SketcherToolbarConstraints size='medium' vertical/>
    <SketcherToolbarGeneral size='medium' vertical/>
  </Abs>;
})

const SketcherToolbarGeneral = createPlugableToolbar(streams => streams.ui.toolbars.sketcherGeneral);
const SketcherToolbarConstraints = createPlugableToolbar(streams => streams.ui.toolbars.sketcherConstraints);
const SketcherToolbarControl = createPlugableToolbar(streams => streams.ui.toolbars.sketcherControl);