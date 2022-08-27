import React, {useContext} from 'react';

import ls from './Wizard.less';
import CadError from '../../../../utils/errors';
import {FormEditContext, FormParamsContext, FormPathContext, FormStateContext} from './form/Form';
import {GenericWizard} from "ui/components/GenericWizard";
import {useStream} from "ui/effects";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {resolveAppearance} from "cad/craft/operationHelper";
import ImgIcon from "ui/components/ImgIcon";

interface WizardProps {
  noFocus: boolean;

  left?: number;

  onCancel(): void;

  onOK(): void;
}

export default function Wizard(props: WizardProps) {

  const ctx = useContext(ReactApplicationContext);
  const state = useStream(ctx => ctx.wizardService.state$);
  const workingRequest = useStream(ctx =>  ctx.wizardService.workingRequest$);

  const formEdit = {
    onChange: (fullPath, value) => ctx.wizardService.updateParam(fullPath, value),
    setActive: (fullPathFlatten, isActive) => ctx.wizardService.updateState(state => {
      state.activeParam = isActive ? fullPathFlatten : null;
    })
  };

  if (!workingRequest) {
    return;
  }

  const operation = ctx.operationService.get(workingRequest.type);

  if (!operation) {
    return;
  }

  const error = state.error;

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

  const {left} = props;
  const appearance = resolveAppearance(operation, workingRequest.params);
  const title = appearance.label.toUpperCase();
  const icon = <ImgIcon url={appearance.icon32} size={16}/>;

  const Form = operation.form;

  return <GenericWizard
    left={left}
    title={title}
    icon={icon}
    onClose={cancel}
    setFocus={focusFirstInput}
    className='Wizard'
    data-operation-id={operation.id}
    documentationLink={operation.documentationLink}
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
          <FormEditContext.Provider value={formEdit}>
            <Form/>
          </FormEditContext.Provider>
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
