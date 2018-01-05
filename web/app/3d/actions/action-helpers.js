export function checkForSelectedFaces(amount) {
  return (state, app) => {
    state.enabled = app.getFaceSelection().length >= amount;
    if (!state.enabled) {
      state.hint = amount === 1 ? 'requires a face to be selected' : 'requires ' + amount + ' faces to be selected';
    }
  } 
}

export function checkForSelectedSolids(amount) {
  return (state, app) => {
    state.enabled = app.getFaceSelection().length >= amount;
    if (!state.enabled) {
      state.hint = amount === 1 ? 'requires a solid to be selected' : 'requires ' + amount + ' solids to be selected';
    }
  }
}