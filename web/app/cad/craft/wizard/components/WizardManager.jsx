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
import {combine} from 'lstream';

class WizardManager extends React.Component {

  render() {
    
    
    let {insertOperation, registry, close} = this.props;

    if (insertOperation) {
      let operation = registry[insertOperation];
      if (!operation) {
        throw 'unknown operation ' + type;
      }

      let params = this.props.initializeOperation(operation);
      let validator = this.props.createValidator(operation);
      let closeInstance = close;
      return <Wizard type={insertOperation}
              createPreviewer={this.props.previewerCreator(operation)}
              form={operation.form}
              params={params}
              validate={validator}
              close={closeInstance}/>
      
    } else {
      return <HistoryWizard createValidator={this.props.createValidator}
                            getOperation={this.props.getOperation}
                            previewerCreator={this.props.previewerCreator}/>;
    }
  }
}

export default decoratorChain(
  connect(streams => combine(
    streams.wizard,
    streams.craft.modifications,
    streams.operation.registry,
  ).map(([w, {pointer}, registry]) => ({insertOperation: w&&w.type, pointer, registry}))),
  mapContext(ctx => ({
    close: ctx.services.wizard.close,
    initializeOperation: operation => initializeBySchema(operation.schema, ctx),
    previewerCreator: operation => () => createPreviewer(operation.previewGeomProvider, ctx.services),
    createValidator: operatation => params => validateParams(ctx.services, params, operatation.schema)
  }))
)
(WizardManager);
