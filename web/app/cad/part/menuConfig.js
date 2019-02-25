export default [
  {
    id: 'file',
    cssIcons: ['file'],
    actions: ['NewProject', '-', 'Save', 'StlExport', 'ImagePngExport', 'NativeFormatExport', '-', 'NativeFormatImport', 
              'NativeFormatImportAs', '-', 'CloneCurrentProject', '-', 'ReassignSketch']
  },
  {
    id: 'craft',
    cssIcons: ['magic'],
    info: 'set of available craft operations on a solid',
    actions: ['EXTRUDE', 'CUT', 'REVOLVE', 'LOFT', 'SHELL', 'FILLET', 'DATUM_CREATE']
  },
  {
    id: 'primitives',
    label: 'add',
    cssIcons: ['cube'],
    info: 'set of available solid creation operations',
    actions: ['PLANE', 'BOX', 'SPHERE', 'CONE', 'CYLINDER', 'TORUS']
  },
  {
    id: 'views',
    label: 'views',
    cssIcons: ['camera'],
    info: 'switching camera views',
    actions: ['StandardViewFront', 'StandardViewBack', 'StandardViewLeft', 'StandardViewRight', 
      'StandardViewTop', 'StandardViewBottom', 'StandardView3Way']
  },
  {
    id: 'boolean',
    label: 'bool',
    cssIcons: ['pie-chart'],
    info: 'set of available boolean operations',
    actions: ['INTERSECTION', 'SUBTRACT', 'UNION']
  },
  {
    id: 'main',
    label: 'start',
    cssIcons: ['rocket'],
    info: 'common set of actions',
    actions: ['EXTRUDE', 'CUT', 'REVOLVE', 'LOFT', 'FILLET', '-', 
      'PLANE', 'BOX', 'SPHERE', 'CONE', 'CYLINDER', 'TORUS', '-',
      'EditFace']
  },
  {
    id: 'SolidContext',
    label: 'solid-context',
    info: 'solid context actions',
    actions: ['LookAtSolid']
  },
  {
    id: 'datum',
    label: 'datum',
    cssIcons: ['magic'],
    info: 'operations on datum',
    actions: ['DATUM_ROTATE', 'DATUM_MOVE', '-', 'PLANE_FROM_DATUM', '-', 'BOX', 'SPHERE', 'CYLINDER', 'TORUS', 'CONE']
    // actions: ['DATUM_MOVE', 'DATUM_ROTATE', 'DATUM_REBASE', '-', 'PLANE_FROM_DATUM', 'BOX', 'SPHERE', 'TORUS', 
    //   'CONE', 'CYLINDER']
  },

];
