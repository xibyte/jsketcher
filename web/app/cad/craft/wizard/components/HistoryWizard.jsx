import React from 'react';
import connect from 'ui/connect';
import Wizard from './Wizard';
import {finishHistoryEditing, stepOverridingParams} from '../../craftHistoryUtils';
import {NOOP} from 'gems/func';
import decoratorChain from 'ui/decoratorChain';
import mapContext from 'ui/mapContext';
import {createPreviewer} from '../../../preview/scenePreviewer';

function HistoryWizard({history, pointer, step, cancel, offset, getOperation, previewerCreator, createValidator}) {
  if (pointer === history.length - 1) {
    return null;
  }

  let {type, params} = history[pointer + 1];
  
  let operation = getOperation(type);
  if (operation === null) {
    //unknown operation
    return null;
  }
  return <Wizard type={type}
                 validate={createValidator(operation)}
                 createPreviewer={previewerCreator(operation)}
                 params={clone(params)}
                 form={operation.form}
                 onCancel={cancel} onOK={step} close={NOOP} left={offset} />

}

export default decoratorChain(
  connect(streams => streams.craft.modifications),
  mapContext(({streams, services}) => ({
    step: params => streams.craft.modifications.update(modifications => stepOverridingParams(modifications, params)),
    cancel: () => streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
  }))
)(HistoryWizard);

function clone(params) {
  return JSON.parse(JSON.stringify(params));
}