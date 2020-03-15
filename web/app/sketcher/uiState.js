
export function saveUIState(dock) {
  const state = {
  };

  state.dockWidth = dock.dockEl.width();
  state.views = dock.getState();

  const dimTextArea = document.getElementById('dimTextArea');
  if (dimTextArea) {
    state.dimTextAreaHeight = dimTextArea.offsetHeight;
  }

  localStorage.setItem('UI', JSON.stringify(state));
}

export function loadUIState(dock) {
  const stateStr = localStorage.getItem('UI');
  if (!stateStr) {
    return;
  }
  try {

    const state = JSON.parse(stateStr);

    if (state.dockWidth) {
      dock.dockEl.width(state.dockWidth);
    }

    const dimTextArea = document.getElementById('dimTextArea');
    if (state.dimTextAreaHeight && dimTextArea) {
      dimTextArea.style.height  = state.dimTextAreaHeight + 'px';
    }

    if (state.views) {
      dock.setState(state.views);
    }

  } catch (e) {
    console.error(e);
  }
}
