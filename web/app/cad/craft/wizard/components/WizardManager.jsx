import React from 'react';
import Wizard from './Wizard';
import connect from 'ui/connect';
import decoratorChain from 'ui/decoratorChain';
import mapContext from 'ui/mapContext';

function WizardManager({wizardContext, type, changingHistory, cancel, cancelHistoryEdit, applyWorkingRequest}) {
  if (!wizardContext) {
    return null;
  }
  return <Wizard key={wizardContext.ID}
                 context={wizardContext}
                 onCancel={changingHistory ? cancelHistoryEdit : cancel}
                 onOK={applyWorkingRequest} />
}

export default decoratorChain(
  connect(streams => streams.wizard.wizardContext.map(wizardContext => ({wizardContext}))),
  mapContext(ctx => ({
    cancel: ctx.services.wizard.cancel,
    applyWorkingRequest: ctx.services.wizard.applyWorkingRequest 
  }))
)
(WizardManager);
