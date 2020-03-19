import React, {useContext} from 'react';
import {getSketcherAction} from "../actions";
import {SketcherAppContext} from "./SketcherApp";
import ls from './SketcherToolbar.less';
import cx from 'classnames';

export function SketcherToolbar({actions, horizontal=false, compact}) {

  return <div className={cx(ls[horizontal?'horizontal':'vertical'], ls.root, compact && ls.compact)}>
    {actions.map((action, index) => {
      if (action === '-') {
        return <div key={index} className={ls.separator} />
      }
      return <SketcherActionButton key={action} actionId={action}/>
    })}
  </div>;
}

export function SketcherActionButton({actionId}) {

  const action = getSketcherAction(actionId);

  if (!action) {
    return <span>?{actionId}?</span>;
  }

  const ctx = useContext(SketcherAppContext);

  const Icon = action.icon;

  return <button onClick={e => action.invoke(ctx, e)} title={action.description} className={`action-kind-${action.kind}`}>
    {Icon ? <Icon /> : action.shortName}
  </button>;

}
