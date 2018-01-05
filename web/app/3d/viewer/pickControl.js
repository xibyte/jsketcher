

export default class PickControl {
  constructor(bus) {
    this.bus = bus;
  }
}

export function initPickControl(domElement, onPick) {
  let mouseState = {
    startX: 0,
    startY: 0
  };

  //fix for FireFox
  function fixOffsetAPI(event) {
    if (event.offsetX === undefined) {
      event.offsetX = event.layerX;
      event.offsetY = event.layerY;
    }
  }

  domElement.addEventListener('mousedown',
    function (e) {
      fixOffsetAPI(e);
      mouseState.startX = e.offsetX;
      mouseState.startY = e.offsetY;
    }, false);

  domElement.addEventListener('mouseup',
    function (e) {
      fixOffsetAPI(e);
      let dx = Math.abs(mouseState.startX - e.offsetX);
      let dy = Math.abs(mouseState.startY - e.offsetY);
      let TOL = 1;
      if (dx < TOL && dy < TOL) {
        onPick(e);
      }
    }, false);
}