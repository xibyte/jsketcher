export function checkForSelectedFaces(amount) {
  return (state, selection) => {
    state.enabled = selection.length >= amount;
    if (!state.enabled) {
      state.hint = amount === 1 ? 'requires a face to be selected' : 'requires ' + amount + ' faces to be selected';
    }
  } 
}

export function checkForSelectedSolids(amount) {
  return (state, selection, context) => {
    state.enabled = context.services.selection.face.objects.length >= amount;
    if (!state.enabled) {
      state.hint = amount === 1 ? 'requires a solid to be selected' : 'requires ' + amount + ' solids to be selected';
    }
  }
}

export function requiresFaceSelection(amount) {
  return {
    listens: ctx => ctx.streams.selection.face,
    update: checkForSelectedFaces(amount)
  }
}

export function requiresSolidSelection(amount) {
  return {
    listens: ctx => ctx.streams.selection.face,
    update: checkForSelectedSolids(amount)
  }
}
