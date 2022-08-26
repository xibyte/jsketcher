import React, {useContext} from 'react';
import {ReactApplicationContext} from "../dom/ReactApplicationContext";

export function ActionButtonBehavior({children, actionId}) {

  const ctx = useContext(ReactApplicationContext);

  const request = {actionId, x: 0, y: 0};

  let canceled = true;
  let shown = false;

  function updateCoords({pageX, pageY}) {
    request.x = pageX + 10;
    request.y = pageY + 10;
  }

  const actionService = ctx.actionService;

  return children({
    'data-action-id': actionId,
    onClick: e => {
      canceled = true;
      actionService.run(actionId, e);
    },
    onMouseEnter: e => {
      updateCoords(e);
      canceled = false;
      shown = false;
      setTimeout(() => {
        if (!canceled) {
          shown = true;
          actionService.showHintFor(request)
        }
      }, 500);
    },
    onMouseMove: updateCoords,
    onMouseLeave: () => {
      canceled = true;
      if (shown) {
        actionService.showHintFor(null)
      }
    }
  });
}
