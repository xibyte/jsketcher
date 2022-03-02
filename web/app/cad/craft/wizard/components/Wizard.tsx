import React, {useContext} from 'react';

import ls from './Wizard.less';
import CadError from '../../../../utils/errors';
import {FormParamsContext, FormPathContext, FormStateContext} from './form/Form';
import {GenericWizard} from "ui/components/GenericWizard";
import {useStream} from "ui/effects";
import {AppContext} from "cad/dom/components/AppContext";

interface WizardProps {
  noFocus: boolean;

  left?: number;

  onCancel(): void;

  onOK(): void;
}

export default function Wizard(props: WizardProps) {

  const ctx = useContext(AppContext);
  const state = useStream(ctx => ctx.wizardService.state$);
  const workingRequest = useStream(ctx =>  ctx.wizardService.workingRequest$);

  if (!workingRequest) {
    return;
  }

  const operation = ctx.operationService.get(workingRequest.type);

  if (!operation) {
    return;
  }

  const error = state.error;

  const onKeyDown = e => {
    switch (e.keyCode) {
      case 27 :
        cancel();
        break;
      case 13 :
        onOK();
        break;
    }
  };

  const focusFirstInput = el => {
    if (props.noFocus) {
      return;
    }
    let toFocus = el.querySelector('input, select');
    if (!toFocus) {
      toFocus = el;
    }
    toFocus.focus();
  };

  const cancel = () => {
    props.onCancel();
  };

  const onOK = () => {
    props.onOK();
  };

  let {left} = props;
  let wizardService = ctx.wizardService;

  let title = (operation.label || operation.id).toUpperCase();

  let Form = operation.form;

  return <GenericWizard
    left={left}
    title={title}
    onClose={cancel}
    onKeyDown={onKeyDown}
    setFocus={focusFirstInput}
    className='Wizard'
    data-operation-id={operation.id}
    topicId={operation.id}
    onCancel={cancel}
    onOK={onOK}
    infoText={<>
      {error && <ErrorPrinter error={error}/>}
      <PipelineError />
    </>}
  >

    <FormParamsContext.Provider value={workingRequest.params}>
      <FormPathContext.Provider value={[]}>
        <FormStateContext.Provider value={state}>
          <Form/>
        </FormStateContext.Provider>
      </FormPathContext.Provider>
    </FormParamsContext.Provider>

  </GenericWizard>;
}


function PipelineError() {
  const pipelineFailure = useStream(ctx => ctx.craftService.pipelineFailure$);
  if (!pipelineFailure) {
    return null;
  }
  return <ErrorPrinter error={pipelineFailure}/>
}

function ErrorPrinter({error}) {
  return <div className={ls.errorMessage}>
    {CadError.ALGORITHM_ERROR_KINDS.includes(error.kind) && <span>
                        performing operation with current parameters leads to an invalid object
                        (self-intersecting / zero-thickness / complete degeneration or unsupported cases)
                      </span>}
    {error.code && <div className={ls.errorCode}>{error.code}</div>}
    {error.userMessage && <div className={ls.userErrorMessage}>{error.userMessage}</div>}
    {!error.userMessage && <div>internal error processing operation, check the log</div>}
  </div>
}
