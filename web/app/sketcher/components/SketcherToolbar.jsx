import React, {useContext} from 'react';
import {getSketcherAction} from "../actions";
import {SketcherAppContext} from "./SketcherApp";
import ls from './SketcherToolbar.less';

export function SketcherToolbar({actions}) {

  return <div className={ls.root}>
    {actions.map(action => <SketcherActionButton key={action} actionId={action}/>)}
  </div>;
}

export function SketcherActionButton({actionId}) {

  const action = getSketcherAction(actionId);

  if (!action) {
    return <span>?{actionId}?</span>;
  }

  const ctx = useContext(SketcherAppContext);

  const Icon = action.icon;

  return <button onClick={() => action.invoke(ctx)} title={action.description}>
    {Icon ? <Icon /> : action.shortName}
  </button>;

}
