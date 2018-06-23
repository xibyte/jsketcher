import React from 'react';
import connect from 'ui/connect';
import Wizard from './Wizard';
import {finishHistoryEditing, stepOverridingParams} from '../../craftHistoryUtils';
import {NOOP} from 'gems/func';
import decoratorChain from 'ui/decoratorChain';
import mapContext from 'ui/mapContext';

function HistoryWizard({history, pointer, step, cancel, offset}) {
  if (pointer === history.length - 1) {
    return null;
  }
  
  let {type, params: initialState} = history[pointer + 1];
  return <Wizard type={type}
                 onCancel={cancel} onOK={step} close={NOOP}
                 initialState={initialState} left={offset} />

}

export default decoratorChain(
  connect(streams => streams.craft.modifications),
  mapContext(({streams}) => ({
    step: params => streams.craft.modifications.update(modifications => stepOverridingParams(modifications, params)),
    cancel: () => streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
  }))
)(HistoryWizard);
