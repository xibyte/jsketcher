import {
  FormEditContext,
  FormParamsContext,
  FormPathContext,
  FormStateContext,
  Group
} from "cad/craft/wizard/components/form/Form";
import Entity from "../../cad/craft/wizard/components/form/EntityList";
import React, {useContext, useEffect, useState} from "react";
import Window from "ui/components/Window";
import Stack from "ui/components/Stack";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";
import {useStreamWithUpdater} from "ui/effects";
import {SketcherAppContext} from "./SketcherAppContext";
import {TextField} from "cad/craft/wizard/components/form/Fields";


export default function SketcherOperationWizard() {

  const [state, setState] = useState(null);

  const {viewer} = useContext(SketcherAppContext);
  const [operationRequest, setRequest] = useStreamWithUpdater(streams => streams.ui.$wizardRequest);

  const onClose = () => setRequest(null);
  const apply = () => {
    onClose();
    operationRequest && operationRequest.onApply(state.params);
  };

  useEffect(() => {
    if (operationRequest) {

      const schema = operationRequest.schema;

      const params = {};
      const indexedSchema = {};

      for (const field of schema) {
        indexedSchema[field.name] = field;

        if (field.type === 'selection') {
          params[field.name] = [];
        } if (field.type === 'string') {
          params[field.name] = '';
        }
      }

      setState({params});

      viewer.customSelectionHandler = (objects, exclusive) => {

        setState(state => {
          const {activeParam, params} = state;
          let selectionParam = activeParam;
          if (!(indexedSchema[selectionParam] && indexedSchema[selectionParam].type === 'selection')) {
            const found = schema.find(f => f.type === 'selection');
            if (!found) {
              return state;
            }
            selectionParam = found.name;
          }

          return {
            activeParam,
            params: {
              ...params,
              [selectionParam]: exclusive ? objects : [...params[selectionParam], ...objects]
            }
          }
        });
      };

      return () => {
        viewer.customSelectionHandler = null;
        viewer.withdrawGlobal();
        viewer.refresh();
      }
    }
  }, [operationRequest]);

  useEffect(() => {
    if (state && operationRequest) {
      syncSelection(state.params, operationRequest.schema, viewer);
    }
  });

  if (!operationRequest || !state) {
    return null;
  }
  const {title, schema} = operationRequest;
  const {activeParam, params} = state;

  const formEdit = {
    onChange: (name, val) => setState(state => ({...state, params: {...params, [name]: val}})),
    setActive: (fullPathFlatten, isActive) => setState(state => ({...state,
      activeParam: isActive ? fullPathFlatten : null
    }))
  };

  return <Window initWidth={250} initLeft={255} initTop={5}
                 title={title.toUpperCase()}
                 onClose={onClose}>


    <FormParamsContext.Provider value={params}>
      <FormPathContext.Provider value={[]}>
        <FormStateContext.Provider value={state}>
          <FormEditContext.Provider value={formEdit}>
            <Group>
            {schema.map(field => {
              const fieldLabel = field.title || field.name;
              return (() => {

                if (field.type === 'selection') {
                  return <Entity name={field.name} title={fieldLabel}
                                 placeholder={schema.placeholder} key={field.name}
                                 onEntityEnter={obj => {viewer.capture('highlight2', [obj], true); viewer.refresh();}}
                                 onEntityLeave={obj => {viewer.withdrawAll('highlight2');viewer.refresh();}}
                                 entityRenderer={entityRenderer}/>
                } else if (field.type === 'string') {
                  return <TextField key={field.name} name={field.name} label={fieldLabel} />
                }
              })();

            })}
          </Group>
          </FormEditContext.Provider>
        </FormStateContext.Provider>
      </FormPathContext.Provider>
    </FormParamsContext.Provider>

    <Stack>
      <ButtonGroup>
        <Button onClick={onClose}>Cancel</Button>
        <Button type='accent' onClick={apply}>OK</Button>
      </ButtonGroup>
    </Stack>
  </Window>;


}

function entityRenderer(obj) {

  return obj.simpleClassName + ':' + obj.id;

}


function syncSelection(params, schema, viewer) {
  for (const field of schema) {
    if (field.type === 'selection') {
      const selection = params[field.name];
      if (selection) {
        viewer.capture(field.capture, selection, true);
      }
    }
    viewer.refresh();
  }
}