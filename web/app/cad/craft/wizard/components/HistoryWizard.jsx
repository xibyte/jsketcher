import React from 'react';
import connect from 'ui/connect';
import Wizard from './Wizard';
import {finishHistoryEditing, stepOverridingParams} from '../../craftHistoryUtils';
import {NOOP} from 'gems/func';
import decoratorChain from 'ui/decoratorChain';
import mapContext from 'ui/mapContext';

function HistoryWizard({history, pointer, step, cancel, offset, getOperation, previewerCreator, createValidator}) {


}

export default decoratorChain(
  connect(streams => streams.craft.modifications),
  mapContext(({streams, services}) => ({
    step: params => streams.craft.modifications.update(modifications => stepOverridingParams(modifications, params)),
    cancel: () => streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
  }))
)(HistoryWizard);

