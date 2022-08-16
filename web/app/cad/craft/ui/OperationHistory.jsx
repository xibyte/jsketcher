import React from 'react';
import Stack from 'ui/components/Stack';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import ImgIcon from 'ui/components/ImgIcon';
import ls from './OperationHistory.less';
import cx from 'classnames';
import ButtonGroup from 'ui/components/controls/ButtonGroup';
import Button from 'ui/components/controls/Button';
import {finishHistoryEditing, removeAndDropDependants} from '../craftHistoryUtils';
import mapContext from 'ui/mapContext';
import decoratorChain from 'ui/decoratorChain';
import {EMPTY_OBJECT} from 'gems/objects';

function OperationHistory({history, pointer, setHistoryPointer, remove, getOperation}) {
  const lastMod = history.length - 1;
  return <Stack>

    {history.map(({type, params}, index) => {

      const {appearance, label, paramsInfo, paramsInfoComponent: PIComp} = getOperation(type)||EMPTY_OBJECT;
      return <div key={index} onClick={() => setHistoryPointer(index - 1)} 
                  className={cx(ls.item, pointer + 1 === index && ls.selected)}>
        {appearance && <ImgIcon url={appearance.icon32} size={16}/>}
        <span className={ls.opLabel}>{label} {PIComp ? <PIComp params={params}/> : (paramsInfo && paramsInfo(params))} </span>
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

export default decoratorChain(
  connect(streams => streams.craft.modifications),
  mapContext(({streams, services}) => ({
    remove: atIndex => streams.craft.modifications.update(modifications => removeAndDropDependants(modifications, atIndex)),
    cancel: () => streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
    getOperation: services.operation.get,
    setHistoryPointer: pointer => streams.craft.modifications.update(({history}) => ({history, pointer}))
  }))
)(OperationHistory);

