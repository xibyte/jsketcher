import React from 'react';

import {mapActionBehavior} from './actionButtonBehavior';
import mapContext from '../../../../modules/ui/mapContext';

export function actionDecorator(actionId) {
  return mapContext(mapActionBehavior(actionId));
}