import React, {Fragment} from 'react';

import {mapActionBehavior} from './actionButtonBehavior';

export function actionDecorator(actionId) {
  let actionBehavior = mapActionBehavior(actionId);
  return function (Component) {
    return function ActionDecorator(props) {
      return <Component {...actionBehavior} {...props}/>;  
    }
  }
}