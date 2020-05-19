import React, {useContext} from 'react';
import {AppContext} from "../dom/components/AppContext";

export function ActionButtonBehavior({children, actionId}) {

  const ctx = useContext(AppContext);

  const request = {actionId, x: 0, y: 0};

  let canceled = true;
  let shown = false;

  function updateCoords({pageX, pageY}) {
    request.x = pageX + 10;
    request.y = pageY + 10;
  }

  const actionService = ctx.services.action;

  return children({
    'data-action-id': actionId,
    onClick: e => actionService.run(actionId, e),
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
