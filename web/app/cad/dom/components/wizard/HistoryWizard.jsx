import React from 'react';
import connect from '../../../../../../modules/ui/connect';
import {TOKENS as CRAFT_TOKENS} from '../../../craft/craftPlugin';
import Wizard from './Wizard';
import {finishHistoryEditing, stepOverridingParams} from '../../../craft/craftHistoryUtils';

function HistoryWizard({history, pointer, step, cancel, offset}) {
  if (pointer === history.length - 1) {
    return null;
  }
  
  let {type, params: initialState} = history[pointer + 1];
  return <Wizard type={type}
                 onCancel={cancel} onOK={step} close={NOOP}
                 initialState={initialState} left={offset} />

}

export default connect(HistoryWizard, CRAFT_TOKENS.MODIFICATIONS, {
  mapActions: ({updateState}) => ({
    step: (params) => updateState(CRAFT_TOKENS.MODIFICATIONS, modifications => stepOverridingParams(modifications, params)),
    cancel: () => updateState(CRAFT_TOKENS.MODIFICATIONS, modifications => finishHistoryEditing(modifications)),
  }),
  mapSelfProps: ({offset}) => ({offset})
});

const NOOP = () => {};
