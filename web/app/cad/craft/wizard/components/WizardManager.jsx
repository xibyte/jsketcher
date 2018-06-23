import React, {Fragment} from 'react';
import Wizard from './Wizard';
import HistoryWizard from './HistoryWizard';
import connect from '../../../../../../modules/ui/connect';
import decoratorChain from '../../../../../../modules/ui/decoratorChain';
import mapContext from '../../../../../../modules/ui/mapContext';
import {finishHistoryEditing} from '../../craftHistoryUtils';

class WizardManager extends React.Component {
  
  render() {
    if (this.hasError) {
      return null;
    }
    let {wizards, close} = this.props;
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
    </Fragment>;
  }
  
  componentDidCatch() {
    this.hasError = true;
    this.props.reset();
    this.hasError = false;
  }
}

function offset(wizardIndex) {
  return 70 + (wizardIndex * (250 + 20)); 
}

export default decoratorChain(
  connect(streams => streams.wizards.map(wizards => ({wizards}))),
  mapContext(({services, streams}) => ({
    close: wizard => services.wizard.close(wizard),
    reset: () => {
      streams.wizards.value = [];
      streams.craft.modifications.update(modifications => finishHistoryEditing(modifications));
    }
  }))
)
(WizardManager);
