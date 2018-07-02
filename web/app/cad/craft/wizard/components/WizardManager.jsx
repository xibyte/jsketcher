import React from 'react';
import Wizard from './Wizard';
import HistoryWizard from './HistoryWizard';
import connect from '../../../../../../modules/ui/connect';
import decoratorChain from '../../../../../../modules/ui/decoratorChain';
import mapContext from '../../../../../../modules/ui/mapContext';
import {finishHistoryEditing} from '../../craftHistoryUtils';
import {createPreviewer} from '../../../preview/scenePreviewer';
import errorBoundary from 'ui/errorBoundary';
import initializeBySchema from '../../intializeBySchema';
import validateParams from '../../validateParams';

class WizardManager extends React.Component {
  
  render() {
    let {wizards, close} = this.props;
    return <React.Fragment>
      {wizards.map((wizardRef, wizardIndex) => {
        let {type} = wizardRef;
        let operation = this.props.getOperation(type);
        if (!operation) {
          throw 'unknown operation ' + type;
        }

        let params = this.props.initializeOperation(operation);
        let validator = this.props.createValidator(operation);
        const closeInstance = () => close(wizardRef);
        return <Wizard key={wizardIndex}
                       type={type}
                       createPreviewer={this.props.previewerCreator(operation)}
                       form={operation.form}
                       params={params}
                       validate={validator}
                       close={closeInstance}
                       left={offset(wizardIndex)} />
      })}
      <HistoryWizard offset={offset(wizards.length)}
                     createValidator={this.props.createValidator}
                     getOperation={this.props.getOperation}
                     previewerCreator={this.props.previewerCreator}/>
    </React.Fragment>;
  }
}

function offset(wizardIndex) {
  return 70 + (wizardIndex * (250 + 20)); 
}

export default decoratorChain(
  connect(streams => streams.wizards.map(wizards => ({wizards}))),
  mapContext(ctx => ({
    close: wizard => ctx.services.wizard.close(wizard),
    reset: () => {
      ctx.streams.wizards.value = [];
      ctx.streams.craft.modifications.update(modifications => finishHistoryEditing(modifications));
    },
    getOperation: type => ctx.services.operation.get(type),
    initializeOperation: operation => initializeBySchema(operation.schema, ctx),
    previewerCreator: operation => () => createPreviewer(operation.previewGeomProvider, ctx.services),
    createValidator: operatation => params => validateParams(ctx.services, params, operatation.schema)
  })),
  errorBoundary(({reset}) => reset())
)
(WizardManager);
