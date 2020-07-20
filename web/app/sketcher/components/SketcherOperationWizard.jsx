import {FormContext, Group} from "../../cad/craft/wizard/components/form/Form";
import Entity from "../../cad/craft/wizard/components/form/EntityList";
import React, {useContext, useEffect, useState} from "react";
import Window from "ui/components/Window";
import Stack from "ui/components/Stack";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";
import {useStreamWithUpdater} from "ui/effects";
import {SketcherAppContext} from "./SketcherAppContext";


export default function SketcherOperationWizard({}) {

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

      for (let field of schema) {
        indexedSchema[field.name] = field;

        if (field.type === 'selection') {
          params[field.name] = [];
        }
      }

      setState({params});

      viewer.customSelectionHandler = (objects, exclusive) => {

        setState(state => {
          const {activeParam, params} = state;
          let selectionParam = activeParam;
          if (!(indexedSchema[selectionParam] && indexedSchema[selectionParam].type === 'selection')) {
            let found = schema.find(f => f.type === 'selection');
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

  let formContext = {
    data: params,
    activeParam,
    setActiveParam: (activeParam) => setState(state => ({...state, activeParam})),
    updateParam: (name, val) => setState(state => ({...state, params: {...params, name: val}}))
  };



  return <Window initWidth={250} initLeft={255} initTop={5}
                 title={title.toUpperCase()}
                 onClose={onClose}>

    <FormContext.Provider value={formContext}>

      <Group>
        {schema.map(field => {
          return (() => {

            if (field.type === 'selection') {
              return <Entity name={field.name} title={field.title || field.name}
                             placeholder={schema.placeholder} key={field.name}
                             onEntityEnter={obj => {viewer.capture('highlight2', [obj], true); viewer.refresh();}}
                             onEntityLeave={obj => {viewer.withdrawAll('highlight2');viewer.refresh();}}
                             entityRenderer={entityRenderer}/>
            }
          })();

        })}
      </Group>

    </FormContext.Provider>
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
  for (let field of schema) {
    if (field.type === 'selection') {
      const selection = params[field.name];
      if (selection) {
        viewer.capture(field.capture, selection, true);
      }
    }
    viewer.refresh();
  }
}