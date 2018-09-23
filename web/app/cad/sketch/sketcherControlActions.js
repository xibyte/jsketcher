export default [
  {
    id: 'sketchSaveAndExit',
    appearance: {
      info: 'save sketch changes and exit',
      label: 'commit',
      cssIcons: ['check'],
    },
    invoke: ({services}) => {
      services.sketcher.inPlaceEditor.save();
      services.sketcher.inPlaceEditor.exit();
    }
  },
  {
    id: 'sketchOpenInTab',
    appearance: {
      info: 'save changes and open sketch 2D in a tab',
      label: '2D',
      cssIcons: ['external-link'],
    },
    invoke: ({services}) => {
      let face = services.sketcher.inPlaceEditor.face;
      services.sketcher.inPlaceEditor.save();
      services.sketcher.inPlaceEditor.exit();
      services.sketcher.sketchFace2D(face);
    }
  }
]