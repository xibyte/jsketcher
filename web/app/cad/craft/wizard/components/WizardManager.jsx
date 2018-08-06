import React from 'react';
import Wizard from './Wizard';
import HistoryWizard from './HistoryWizard';
import connect from '../../../../../../modules/ui/connect';
import decoratorChain from '../../../../../../modules/ui/decoratorChain';
import mapContext from '../../../../../../modules/ui/mapContext';
import {finishHistoryEditing, stepOverridingParams} from '../../craftHistoryUtils';
import {createPreviewer} from '../../../preview/scenePreviewer';
import errorBoundary from 'ui/errorBoundary';
import initializeBySchema from '../../intializeBySchema';
import validateParams from '../../validateParams';
import {combine} from 'lstream';
import {NOOP} from '../../../../../../modules/gems/func';

class WizardManager extends React.Component {

  render() {

    let {insertOperation, registry, close, history, pointer, stepHistory, cancelHistoryEdit, 
      previewerCreator, createValidator, initializeOperation} = this.props;

    if (insertOperation) {
      let operation = registry[insertOperation];
      if (!operation) {
        throw 'unknown operation ' + type;
      }

      let params = initializeOperation(operation);
      return <Wizard type={insertOperation}
              createPreviewer={previewerCreator(operation)}
              form={operation.form}
              params={params}
              validate={createValidator(operation)}
              close={close}/>
      
    } else {

      if (pointer === history.length - 1) {
        return null;
      }
      
      let {type, params} = history[pointer + 1];
      let operation = registry[type];
      if (!operation) {
        throw 'unknown operation ' + type;
      }

      return <Wizard type={type}
                     validate={createValidator(operation)}
                     createPreviewer={previewerCreator(operation)}
                     params={clone(params)}
                     form={operation.form}
                     onCancel={cancelHistoryEdit} onOK={stepHistory} close={NOOP} />
    }
  }
}

export default decoratorChain(
  connect(streams => combine(
    streams.wizard,
    streams.craft.modifications,
    streams.operation.registry,
  ).map(([w, {pointer, history}, registry]) => ({insertOperation: w&&w.type, pointer, registry, history}))),
  mapContext(ctx => ({
    close: ctx.services.wizard.close,
    initializeOperation: operation => initializeBySchema(operation.schema, ctx),
    previewerCreator: operation => () => createPreviewer(operation.previewGeomProvider, ctx.services),
    createValidator: operatation => params => validateParams(ctx.services, params, operatation.schema),
    stepHistory: params => ctx.streams.craft.modifications.update(modifications => stepOverridingParams(modifications, params)),
    cancelHistoryEdit: () => ctx.streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
  }))
)
(WizardManager);

function clone(params) {
  return JSON.parse(JSON.stringify(params));
}