import React, {Fragment} from 'react';
import ls from './ActionInfo.less';

import AuxWidget from '../../../../../modules/ui/components/AuxWidget';
import connect from '../../../../../modules/ui/connect';
import {TOKENS as ACTION_TOKENS} from '../../actions/actionSystemPlugin';
import {TOKENS as KeyboardTokens} from '../../keyboard/keyboardPlugin';

function ActionInfo({actionId, x, y, info, hint, hotKey}) {
  let visible = !!actionId;
  
  return <AuxWidget visible={visible} 
    left={x} top={y} className={ls.root} zIndex={550}>
    {visible && <Fragment>
      <div className='hint'>{hint}</div>
      <div className='info'>{info}</div>
      {hotKey && <div className='hotKey'>hotkey: {hotKey}</div>}
    </Fragment>}
  </AuxWidget>;
}

export default connect(ActionInfo, [ACTION_TOKENS.HINT, KeyboardTokens.KEYMAP], { 
  mapProps: ([ hintInfo, keymap ]) => (Object.assign({hotKey: hintInfo && keymap[hintInfo.actionId]}, hintInfo)) 
}); 

