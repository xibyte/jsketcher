import {GiCube} from "react-icons/all";
import {TbFolder} from "react-icons/tb";

export default [
  {
    id: 'file',
    icon: TbFolder,
    label: 'File',
    actions: ['NewProject', '-', 'Save', 'StlExport', 'ImagePngExport', 'NativeFormatExport', '-', 'NativeFormatImport', 
              'NativeFormatImportAs', '-', 'CloneCurrentProject']
  },
  {
    id: 'craft',
    cssIcons: ['magic'],
    info: 'set of available craft operations on a solid',
    actions: ['EXTRUDE', 'CUT', 'REVOLVE', 'LOFT', 'SHELL', 'FILLET', 'DATUM_CREATE', ]
  },
  {
    id: 'primitives',
    label: 'add',
    cssIcons: ['cube'],
    info: 'set of available solid creation operations',
    actions: ['PLANE', "primitive_cylinder", "primitive_box", "primitive_cone", "primitive_sphere", "primitive_torus"]
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
    id: 'settings',
    label: 'Settings',
    cssIcons: ['cog'],
    info: 'settings',
    actions: ['menu.viewModes', 'ToggleCameraMode']
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
    id: 'datum',
    label: 'datum',
    cssIcons: ['magic'],
    info: 'operations on datum',
    actions: ['PLANE', '-', 'BOX', 'SPHERE', 'CYLINDER', 'TORUS', 'CONE']
    // actions: ['DATUM_MOVE', 'DATUM_ROTATE', 'DATUM_REBASE', '-', 'PLANE_FROM_DATUM', 'BOX', 'SPHERE', 'TORUS', 
    //   'CONE', 'CYLINDER']
  },
  {
    id: 'contextual',
    label: 'contextual',
    cssIcons: ['magic'],
    info: 'contextual actions',
    actions: ['ModelDisplayOptions', 'ModelAttributesEditor']
  }
];
