import React, {useContext} from 'react';
import ls from './ContextualControls.less';
import {matchAvailableActions} from "../actions";
import {useStream} from "../../../../modules/ui/effects";
import {SketcherAppContext} from "./SketcherApp";
import {MatchIndex, matchSelection} from "../selectionMatcher";

export function ContextualControls() {

  const selection = useStream(ctx => ctx.viewer.streams.selection);

  const ctx = useContext(SketcherAppContext);

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
      availableActions.map(a => <button onClick={() => a.invoke(ctx, matchSelection(a.selectionMatcher, new MatchIndex(selection), false))}
                                        title={a.description}>{a.shortName}</button>)
    }

  </div>;

}
