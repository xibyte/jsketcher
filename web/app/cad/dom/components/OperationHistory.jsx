import React from 'react';
import Stack from 'ui/components/Stack';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import ImgIcon from 'ui/components/ImgIcon';
import ls from './OperationHistory.less';
import cx from 'classnames';
import ButtonGroup from 'ui/components/controls/ButtonGroup';
import Button from 'ui/components/controls/Button';
import {finishHistoryEditing, removeAndDropDependants} from '../../craft/craftHistoryUtils';
import mapContext from 'ui/mapContext';
import decoratorChain from 'ui/decoratorChain';

function OperationHistory({history, pointer, setHistoryPointer, remove, operationRegistry}) {
  let lastMod = history.length - 1;
  return <Stack>

    {history.map(({type, params}, index) => {

      let {appearance, paramsInfo} = getDescriptor(type, operationRegistry);
      return <div key={index} onClick={() => setHistoryPointer(index - 1)} 
                  className={cx(ls.item, pointer + 1 === index && ls.selected)}>
        {appearance && <ImgIcon url={appearance.icon32} size={16}/>}
        <span>{type} {paramsInfo && paramsInfo(params)} </span>
        <span className={ls.buttons}>
          <Fa icon='edit' />
          <Fa icon='image' />
          <Fa icon='remove' className={ls.danger} onClick={() => remove(index)}/>
        </span>
      </div>;
    })}
    {pointer !== lastMod && <ButtonGroup>
      <Button onClick={() => setHistoryPointer(lastMod)}>Finish History Editing</Button>
    </ButtonGroup>}
  </Stack>;
}

const EMPTY_DESCRIPTOR = {};
function getDescriptor(type, registry) {
  let descriptor = registry[type];
  if (!descriptor) {
    descriptor = EMPTY_DESCRIPTOR;
  }
  return descriptor;
}

export default decoratorChain(
  connect(streams => streams.craft.modifications),
  mapContext(({streams, services}) => ({
    remove: atIndex => streams.craft.modifications.update(modifications => removeAndDropDependants(modifications, atIndex)),
    cancel: () => streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
    operationRegistry: services.operation.registry,
    setHistoryPointer: pointer => streams.craft.modifications.update(({history}) => ({history, pointer}))
  }))
)(OperationHistory);

