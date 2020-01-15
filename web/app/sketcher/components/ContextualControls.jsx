import React from 'react';
import ls from './ContextualControls.less';
import connect from "../../../../modules/ui/connect";
import {matchAvailableActions} from "../actions";
import mapContext from "../../../../modules/ui/mapContext";

export const ContextualControls =
  mapContext(ctx => ({
    invokeAction: action => action.invoke(ctx)
  }))(
  connect(streams => streams.sketcherApp.selection.map(selection => ({selection})))(


  function ContextualControls({selection, invokeAction}) {

    if (selection.length === 0) {
      return null;
    }

    const availableActions = matchAvailableActions(selection);

    return <div className={ls.root}>

      {
        selection.map(s => <div className={ls.item}>{s.simpleClassName}: {s.id}</div>)
      }

      <div className={ls.hr}>AVAILABLE ACTIONS:</div>

      {
        availableActions.map(a => <button onClick={() => invokeAction(a)}
                                          title={a.description}>{a.shortName}</button>)
      }

    </div>;

  }
));