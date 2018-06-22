import React from 'react';
import PropTypes from 'prop-types';
import Stack from 'ui/components/Stack';
import connect from 'ui/connectLegacy';
import Fa from 'ui/components/Fa';
import ImgIcon from 'ui/components/ImgIcon';
import ls from './OperationHistory.less';
import cx from 'classnames';

import {TOKENS as CRAFT_TOKENS} from '../../craft/craftPlugin';
import ButtonGroup from '../../../../../modules/ui/components/controls/ButtonGroup';
import Button from '../../../../../modules/ui/components/controls/Button';
import {removeAndDropDependants} from '../../craft/craftHistoryUtils';

function OperationHistory({history, pointer, setHistoryPointer, remove}, {services: {operation: operationService}}) {
  let lastMod = history.length - 1;
  return <Stack>

    {history.map(({type, params}, index) => {

      let {appearance, paramsInfo} = getDescriptor(type, operationService.registry);
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

OperationHistory.contextTypes = {
  services: PropTypes.object
};

export default connect(OperationHistory, CRAFT_TOKENS.MODIFICATIONS, {
  mapActions: ({setState, updateState}) => ({
    setHistoryPointer: pointer => setState(CRAFT_TOKENS.MODIFICATIONS, {pointer}),
    remove: atIndex => updateState(CRAFT_TOKENS.MODIFICATIONS, modifications => removeAndDropDependants(modifications, atIndex))
  })
});
