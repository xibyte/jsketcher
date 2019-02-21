import React from 'react';
import Wizard from './Wizard';
import connect from 'ui/connect';
import decoratorChain from 'ui/decoratorChain';
import mapContext from 'ui/mapContext';
import {finishHistoryEditing} from '../../craftHistoryUtils';

function WizardManager({wizardContext, type, cancel, cancelHistoryEdit, applyWorkingRequest}) {
  if (!wizardContext) {
    return null;
  }
  return <Wizard key={wizardContext.ID}
                 context={wizardContext}
                 noFocus={wizardContext.noWizardFocus}
                 onCancel={wizardContext.changingHistory ? cancelHistoryEdit : cancel}
                 onOK={applyWorkingRequest} />
}

export default decoratorChain(
  connect(streams => streams.wizard.wizardContext.map(wizardContext => ({wizardContext}))),
  mapContext(ctx => ({
    cancel: ctx.services.wizard.cancel,
    cancelHistoryEdit: () => ctx.streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
    applyWorkingRequest: ctx.services.wizard.applyWorkingRequest 
  }))
)
(WizardManager);
