export const PartImportActions = [
  {
    id: 'StartPartImportOperation',
    appearance: {
      info: 'import partt',
      label: 'coincident',
      icon32: 'img/coi.png',
    },
    invoke: ctx => {



      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.coincident(viewer.selected);
    }
  },
];