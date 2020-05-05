import React from 'react';

import {ActionButtonBehavior} from './ActionButtonBehavior';

export function actionDecorator(actionId) {
  return Comp => props => <ActionButtonBehavior actionId={actionId} >
    {bProps => <Comp {...bProps} {...props} />}
  </ActionButtonBehavior>;
}