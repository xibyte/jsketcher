import {GiCube} from 'react-icons/all';

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
    actions: [ 'DATUM_CREATE', 'EditFace', 'EXTRUDE', 'CUT', 'REVOLVE', 'LOFT', 'SWEEP', '-', 
    'SHELL_TOOL', 'FILLET_TOOL', 'SCALE_BODY', 'DEFEATURE_REMOVE_FACE', '-',
    'MIRROR_BODY', 'PATTERN_LINEAR', 'PATTERN_RADIAL',
  ]
  },
  {
    id: 'primitives',
    label: 'add',
    cssIcons: ['cube'],
    info: 'set of available solid creation operations',
    actions: ['PLANE', 'CYLINDER', 'BOX', 'CONE', 'SPHERE', 'TORUS',]
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
    id: 'viewModes',
    label: 'mode',
    icon: GiCube,
    info: 'view/render mode',
    actions: ['ViewMode_WIREFRAME_ON', 'ViewMode_SHADED_ON', 'ViewMode_SHADED_WITH_EDGES_ON']
  },
  {
    id: 'boolean',
    label: 'bool',
    cssIcons: ['pie-chart'],
    info: 'set of available boolean operations',
    actions: ['INTERSECT', 'SUBTRACT', 'UNION']
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
    id: 'datum',
    label: 'datum',
    cssIcons: ['magic'],
    info: 'operations on datum',
    actions: ['PLANE', '-', 'BOX', 'SPHERE', 'CYLINDER', 'TORUS', 'CONE']
  },
  {
    id: 'contextual',
    label: 'contextual',
    cssIcons: ['magic'],
    info: 'contextual actions',
    actions: ['ModelDisplayOptions', 'ModelAttributesEditor']
  }
];
