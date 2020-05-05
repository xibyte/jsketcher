import {getSketcherAction} from "../actions";
import React, {useContext} from "react";
import {SketcherAppContext} from "./SketcherAppContext";

export function SketcherActionButton({actionId, text=false}) {

  const action = getSketcherAction(actionId);

  if (!action) {
    return <span>?{actionId}?</span>;
  }

  const ctx = useContext(SketcherAppContext);

  const Icon = action.icon;

  return <button onClick={e => action.invoke(ctx, e)} title={action.description} className={`action-kind-${action.kind} ${text ? 'icon-button' : ''}`}>
    {Icon && <Icon />} {(text || !Icon) && action.shortName}
  </button>;

}
