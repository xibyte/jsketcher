import React, {Fragment} from 'react';
import ls from './ActionInfo.less';

import AuxWidget from 'ui/components/AuxWidget';
import connect from 'ui/connect';
import {combine} from 'lstream';

function ActionInfo({actionId, x, y, info, hint, hotKey}) {
  let visible = !!(actionId && (info || hint || hotKey));

  return <AuxWidget visible={visible}
                    left={x} top={y} className={ls.root} zIndex={550}>
    {visible && <Fragment>
      {hint && <div className={ls.hint}>{hint}</div>}
      {info && <div className={ls.info}>{info}</div>}
      {hotKey && <div className={ls.hotKey}>hotkey: {hotKey}</div>}
    </Fragment>}
  </AuxWidget>;
}

export default connect(streams => 
  combine(
    streams.action.hint, 
    streams.ui.keymap)
    .map(([hintInfo, keymap]) => Object.assign({hotKey: hintInfo && keymap[hintInfo.actionId]}, hintInfo)
))
(ActionInfo); 

