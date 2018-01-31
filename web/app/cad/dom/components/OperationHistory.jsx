import React from 'react';
import PropTypes from 'prop-types';
import Stack from 'ui/components/Stack';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import ImgIcon from 'ui/components/ImgIcon';
import ls from './OperationHistory.less'

import {TOKENS as CRAFT_TOKENS} from '../../craft/craftPlugin';

function OperationHistory({history, pointer}, {services: {operation: operationService}}) {
  return <Stack>

    {history.map(({type, params}, index) => {

      let {appearance, paramsInfo} = getDescriptor(type, operationService.registry);
      return <div key={index} className={ls.item}>
        {appearance && <ImgIcon url={appearance.icon32} size={16}/>}
        <span>{type} {paramsInfo && paramsInfo(params)} </span>
        <span className={ls.buttons}>
          <Fa icon='edit' />
          <Fa icon='image' />
          <Fa icon='remove' />
        </span>
      </div>;
    })}

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

export default connect(OperationHistory, CRAFT_TOKENS.MODIFICATIONS);
