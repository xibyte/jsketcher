import React, {Fragment} from 'react';
import {TOKENS as WIZARD_TOKENS} from '../../../craft/wizard/wizardPlugin';
import connect from 'ui/connect';
import Wizard from './Wizard';
import HistoryWizard from './HistoryWizard';

function WizardManager({wizards, close}) {
  return <Fragment>
    {wizards.map((wizardRef, wizardIndex) => {
      let {type, initialState} = wizardRef;

      const closeInstance = () => close(wizardRef);
      return <Wizard key={wizardIndex} 
                     type={type}
                     close={closeInstance}
                     initialState={initialState} left={offset(wizardIndex)} /> 
    })}
    <HistoryWizard offset={offset(wizards.length)}/>
  </Fragment>
}


function offset(wizardIndex) {
  return 70 + (wizardIndex * (250 + 20)); 
}

export default connect(WizardManager, WIZARD_TOKENS.WIZARDS, {
  mapProps: ([wizards]) => ({wizards}),
  mapActions: ({dispatch}) => ({
    close: wizard => dispatch(WIZARD_TOKENS.CLOSE, wizard)
  })
});
