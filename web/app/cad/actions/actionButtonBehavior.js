
export function mapActionBehavior(actionIdGetter) {
  return ({services}, props) => {
    const actionId = typeof actionIdGetter === 'string' ? actionIdGetter : actionIdGetter(props);

    let request = {actionId, x:0, y:0};
    let canceled = true;
    let shown = false;

    function updateCoords({pageX, pageY}) {
      request.x = pageX + 10;
      request.y = pageY + 10;
    }
    
    return {
      onClick: e => services.action.run(actionId, e),
      onMouseEnter: e => {
        updateCoords(e);
        canceled = false;
        shown = false;
        setTimeout(() => {
          if (!canceled) {
            shown = true;
            services.action.showHintFor(request)
          }
        }, 500);
      },
      onMouseMove: updateCoords,
      onMouseLeave: () => {
        canceled = true;
        if (shown) {
          services.action.showHintFor(null)
        }
      }
  }};
}
