import React from 'react';
import Wizard from './Wizard';
import connect from 'ui/connect';
import decoratorChain from 'ui/decoratorChain';
import mapContext from 'ui/mapContext';
import {finishHistoryEditing} from '../../craftHistoryUtils';

function WizardManager({type, changingHistory, resolve, cancel, stepHistory, insertOperation, cancelHistoryEdit, applyWorkingRequest}) {
  if (!type) {
    return null;
  }
  return <Wizard resolveOperation={resolve}
                 onCancel={changingHistory ? cancelHistoryEdit : cancel}
                 onOK={applyWorkingRequest} />
}

export default decoratorChain(
  connect(streams => streams.wizard.effectiveOperation),
  mapContext((ctx, props) => ({
    cancel: ctx.services.wizard.cancel,
    resolve: type => ctx.services.operation.get(type),
    cancelHistoryEdit: () => ctx.streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
    applyWorkingRequest: ctx.services.wizard.applyWorkingRequest 
  }))
)
(WizardManager);
