import React, {useContext} from 'react';
import {AppContext} from "../dom/components/AppContext";
import {isMenuAction} from "cad/dom/menu/menuPlugin";

export function ActionButtonBehavior({children, actionId}) {

  const ctx = useContext(AppContext);

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
      let data;
      if (isMenuAction(actionId)) {
        data = {
          x: e.pageX,
          y: e.pageY
        }
      } else {
        data = e;
      }
      actionService.run(actionId, data);
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
