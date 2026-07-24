# Welcome to the JSketcher workbench developer guide!

This guide will describe how to create work bench commands and dialogs used as steps in the part history. JSketcher provides a standard way to define new part history commands that create both the new feature geometry and track the user input fields for a particular command. Input fields are standard user interface elements providing text boxes, numeric inputs and drop downs in addition to rich intelligent geometry selection widgets for sketches, edges, faces, ect.

JSketcher provides a structured mechanism for tracking part history operations and their related inputs. This history can be though of a short program. Each step in the series can generate new geometry and build off of references to the previous steps. Tracking IDs of geometry such as edges, faces and bodies is handled automatically and UI widgets are provided for the selection of these entities from feature command dialogs.

All part history feature commands are added to a folder where you define the:

- Command UI data model
- Command execution code
- Help file documentation for command
- Icon file for toolbars and part history

Full list of OCC commands available here: web/app/cad/craft/e0/OCI.d.ts

# Files

When developing or extending existing workbenches each command needs its own folder under the workbench features folder.

**Template**: jsketcher/workbenches/**{work_bench_name}**/features/**{Feature_Name}**/

**Example** : "jsketcher/workbenches/modeler/features/primitive_box/"

With in your feature folder you must create the following files.

- **./index.ts**
- **./icon.svg (optional if not using an icon provided in the base package)**
- **./docs/readme.md**

## index.ts template structure

The format of the  index.ts file is important and must follow the example convetion outlined below.

At the top you will list the required library imports.

The export default object requires the following things to be defined.

- **id**: String
- **label**: String
- **info**: String
- **icon**: object
- **[paramsInfo](#paramsInfo-tool-tip-information)**: Template for history item info popup. Can be used to expose the current values and description info about the operation for tool tips and hover over context cues.
- **[schema](#Schema-fields-widget-types)**: Model defining the feature dialogs list of input fields, labels and input types. Both the user interface and the feature input properties storage is defined by this unified schema. User interface input widgets are laid out in a vertical stack with in the feature dialog in the order you define here.
- **run**: This is the actual code that will be executed when the preview button or the "OK" button in the feature dialog is pressed. The values defined in the schema are passed in and can be referenced by the simplified OpenCASCADE api provided by the JSKetcher OpenCASCADE wasm interface library. You can find more information about the functions exposed by this **[here](../web/app/cad/craft/e0/OCI.d.ts)**. The run function must return an object with the following format. This format for the return object is required for all feature commands.

```
 let resultsOfCommand ={
 created:[],
 consumed:[]
 }
 return resultsOfCommand;
```

 **Example index.ts file**:

```
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface ExtrudeParams {
  length: number;
  doubleSided:boolean,
  face: MFace;
  direction?: UnitVector,
  boolean: BooleanDefinition
}

export const ExtrudeOperation: OperationDescriptor<ExtrudeParams> = {
  id: 'EXTRUDE',
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo: ({length}) => `(${r(length)})`,
  run: (params: ExtrudeParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.face;

 
    let occFaces = [];

    let sketch = ctx.sketchStorageService.readSketch(face.id);
    if (!sketch) {
      occFaces.push(params.face);
    } else {
      occFaces = occ.utils.sketchToFaces(sketch, face.csys);
    }


    const dir: UnitVector = params.direction || face.normal();

    const extrusionVector = dir.normalize()._multiply(params.length).data();
    const extrusionVectorFliped = dir.normalize()._multiply(params.length).negate().data();


    const tools = occFaces.map((faceName, i) => {
      const shapeName = "Tool/" + i;
      oci.prism(shapeName, faceName, ...extrusionVector);

      if(params.doubleSided){
        oci.prism(shapeName + "B", faceName, ...extrusionVectorFliped);
        oci.bop(shapeName, shapeName + "B");
        oci.bopfuse(shapeName);
      }
      return shapeName;
    });

    return occ.utils.applyBooleanModifier(tools, params.boolean);

  },

  form: [
    {
      type: 'number',
      label: 'length',
      name: 'length',
      defaultValue: 50,
    },
    {
      type: 'checkbox',
      label: 'Double Sided',
      name: 'doubleSided',
      defaultValue: false,
    },
    {
      type: 'selection',
      name: 'face',
      capture: [EntityKind.FACE],
      label: 'face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'direction',
      name: 'direction',
      label: 'direction',
      optional: true
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }
  ],
}
```

# Schema fields widget types

The following widgets are provided to allow rapid development of new modeling feature types. The schema is used to build the stack of UI elements show to the user when a new feature is being added or edited.

Normal Form widgets for values:

- **[string](#string-widget)**
- **[number](#number-widget)**
- **[checkbox](#checkbox-widget)**
- **[choice](#choice-widget)**

Special widgets for interaction with 3d geometry:

- **[select](#select-widget)**
- **[vector](#vector-widget)**
- **[boolean](#boolean-widget)**

Organization:

- **[image](#image-widget)**
- **[text](#text-widget)**

Special Widgets:

- **[file](#file-widget)**

Example of adding a field to the schema. What ever order you place the items in the schema is the order they will be displayed in the resulting dialog.

```
export default {
 //. . .
  form: [
    //fields go here
    {
      type: 'number',
      label: 'length',
      name: 'length',
      defaultValue: 50,
    },
  //. . . 
}
```

## string widget

A simple text entry text entry field.
Returns a string.

```
  {
    type: 'string',
    label: 'String Field',
    name: 'exampleString',
    defaultValue: "hello world",
  },
```

## number widget

A simple numeric value entry field.
Optionally if style property is set can be used as a spinner or slider instead of the regular textbox if left undefined.
Returns a string.

```
  {
    type: 'number',
    label: 'length',
    style: 'slider',
    name: 'length',
    defaultValue: 50,
  },
```

## checkbox widget

A simple checkbox.
Returns a true or false value.

```
  {
    type: 'checkbox',
    label: 'Double Sided',
    name: 'doubleSided',
    defaultValue: false,
  },
```

## choice widget

A choice selection widget providing two styles,
Options are provided as an array of values.
The style property can be either "dropdown" or "radio".

Dropdown example:

```
  {
    type: 'choice',
    style: "dropdown",
    label: 'Corner Style',
    name: 'cornerStyle',
    values: ["Round", "Sharp"],
    defaultValue: "Round",
  },
```

Radio example:

```
  {
      type: 'choice',
      style: "dropdown",
      label: 'operationType',
      name: 'operationType',
      values: ["Fillet", "Champher"],
      defaultValue: "Fillet",
  },
```

## Select widget

The select widget allows for user selection of objects from the 3d environnement.  fggfgf

The multi property dictates if the user is allowed to select more than one object from the model. When set to true an array is returned. When set as false only a single object is returned.

The capture property is an array of object types permitted for user selection. The list of types can be found **[by looking here](#entity-types)**

Default value is optional and provides a way to allow user selection performed before the command started to automatically populate with the users selection. For example in the extrude command if a user has a face selected before executing the extrude operation the face will be captured as a selection automatically.

example:

```
  {
    type: 'selection',
    name: 'face',
    capture: [EntityKind.FACE],
    label: 'face',
    multi: false,
    defaultValue: {
      usePreselection: true,
      preselectionIndex: 0,
    },
  },
```

## Vector widget

Vector widget provides a method to select a direction in JSketcher.
The direction can be derived from several input types.
If a face is selected this will return the normal to the face.
If an edge or sketch curve is selected it will use the edge to derive the vector.
A datum axis can also be used to specify a direction.

A checkbox is also provided with his widget that allows the user to invert or "flip" the direction.

example:

```
  {
    type: 'vector',
    name: 'direction',
    label: 'direction',
    optional: true,
  },
```

## boolean widget

Boolean widget is a special widget that provides a mechanism to capture the intent of the boolean modeling operation and the target shell from the users 3d selection.
A drop down menu is provided to pick the type of boolean operation with the following options.  "None", "Unite", "Subtract" or "Intersect".

example:

```
  {
    type: 'boolean',
    name: 'boolean',
    label: 'boolean',
    optional: true,
  }
```

There is a special function that is ued in conjunction with the boolean widget placed as the return from the run section of the feature code:

```
return occ.utils.applyBooleanModifier(tools, params.boolean);
```

Normally the return would consist of an object containing the arrays for consumed and created objects. This bit of code takes care of the business of populating these arrays and is the preferred method for performing all boolean operations in JSketcher.

## image widget

Allows for an image to be inserted in to the command dialog to illustrate a commands intent. For example you might show an illustration of what each parameter the user sets would be used in generating a feature.

```
  {
    type: 'image',
    name: 'figure1',
    img: imageStringLoadedFromImport,
  }
```

You must add an import at the top of the command typescript file to use an image in a dialog.

```
import imageStringLoadedFromImport from './icon.svg';
```

## text widget

Allows for text to be added to the dialog with instructions or more sophisticated descriptions of an operation to be shown to the user.

```
  {
    type: 'text',
    name: 'descriptiveText',
    label: 'This is a custom text that can be used to show extra info about what particulart parts of the command are to be used.',
  }
```

## file widget

Allows for from the local file system to be selected and the contents be made avaiable to the feature.

```
  {
    type: 'file',
    name: 'file',
    label: 'Select File',

  },
```

## paramsInfo tool tip information

The paramsInfo section is used to define a string that shows up when you mouse over a feature from the time line. You can pass in items defined in the schema and use them to form the string template for the tool top text. The tooltip text is displayed when mousing over the feature in the part history.

```
export default {
	//. . .
    paramsInfo: ({ length, width, height }) => `(Cube - Size: ${r(length)}, ${r(width)}, ${r(height)})`,
    //. . . 
}
```

## Entity types

- EntityKind.SHELL
  - Shell objects represent a solid object. In other cad systems these are some times referred to as bodies.
- EntityKind.FACE
  - Faces represent individual surfaces of a shell. Faces are a nurbs surface bounded by a set of edges.
- EntityKind.EDGE
  - Edges are 3D curve objects that provide boundaries to faces.
- EntityKind.VERTEX
  - Vertexes are point type objects
- EntityKind.SKETCH_OBJECT
  - Sketch objects are a special kind of object generated by the 2D sketcher and are tied to a plane. Sketches contain 2D geometry in the form of curves and can be used as the basis for 3d features.
- EntityKind.DATUM
  - Datums are objects that capture a 3D point and orientation.
- EntityKind.DATUM_AXIS
  - Datum Axis are a vector based off the datums position and orientation.
  - Every datum has an X, Y and Z axis
- EntityKind.LOOP
  - A loop is a 3D curve.

# Theming

JSketcher uses a CSS custom property (CSS variable) based theming system that allows runtime switching between dark and light themes without recompiling. The theme is controlled by a CSS class on the `<body>` element.

## How it works

All theme colors are defined as CSS custom properties in `modules/ui/styles/theme.less`. The `:root` selector defines the default dark theme values. The LESS variables (`@bg-color-1`, `@font-color`, etc.) reference these CSS variables, so the compiled CSS emits `var(--bg-color-1)` which can be overridden at runtime.

A light theme override lives in `modules/ui/styles/theme-light.less` and is applied when `body` has the `theme-light` class. Both theme files are bundled via `modules/ui/styles/global/index.less`.

## Theme variables

The following CSS custom properties control the appearance:

| Variable | Purpose |
|---|---|
| `--hue-prim` | Base hue for the grayscale ramp |
| `--saturation` | Saturation for the grayscale ramp |
| `--bg-color-0` through `--bg-color-9` | 10-step lightness ramp (0=darkest, 9=lightest) |
| `--bg-base-color` | Main app background (defaults to `--bg-color-1`) |
| `--font-color` | Primary text color |
| `--font-color-minor` | Secondary text color |
| `--font-color-suppressed` | Suppressed/inactive text |
| `--font-color-disabled` | Disabled text |
| `--border-color` | Border/divider color |
| `--control-color-number` | Numeric input accent |
| `--control-color-text` | Text input accent |
| `--control-bg` | Input control background |
| `--work-area-color` | 3D viewport canvas background |
| `--work-area-control-bar-bg-color` | Bottom control bar background |
| `--work-area-control-bar-bg-color-active` | Bottom control bar hover/active |
| `--color-danger` | Danger button color |
| `--color-danger-light` | Danger button active state |
| `--color-accent` | Accent button color |
| `--color-accent-dark` | Accent button active state |
| `--color-neutral` | Neutral button color |
| `--color-neutral-dark` | Neutral button active state |
| `--color-highlight` | Highlight/selection color |
| `--color-highlight-dark` | Highlight active state |
| `--color-btn-selected` | Selected button background |
| `--on-color-highlight` | Overlay highlight color |
| `--on-color-highlight-variant-*` | Per-color highlight variants (yellow, pink, red, green, blue) |

## Creating a new theme

1. Create a new file `modules/ui/styles/theme-mytheme.less`
2. Define overrides under a body class selector:

```less
body.theme-mytheme {
  --hue-prim: 210;
  --saturation: 20%;
  --bg-color-0: hsl(var(--hue-prim), var(--saturation), 10%);
  --bg-color-1: hsl(var(--hue-prim), var(--saturation), 15%);
  // ...override any variables you want to change
  --work-area-color: #f0f0f0;
  --font-color: hsl(0, 0, 20%);
}
```

3. Import it in `modules/ui/styles/global/index.less`:
```less
@import "../theme-mytheme.less";
```

4. Toggle the body class from code:
```js
document.body.classList.toggle('theme-mytheme');
if (services.viewer) {
  services.viewer.updateClearColor(); // updates 3D canvas background
}
```

You only need to override the variables that differ from the default dark theme. Any variable not overridden will inherit from `:root`.

## The 3D canvas background

The 3D viewport background is controlled by `--work-area-color`. Unlike the UI panels (which update automatically via CSS), the three.js renderer clear color must be updated in JavaScript. The `SceneSetUp.updateClearColor()` method in `modules/scene/sceneSetup.ts` reads the computed value of `--work-area-color` from `document.body` and applies it to the WebGLRenderer. Call `viewer.updateClearColor()` after any theme change.

## Theme toggle action

The `ToggleTheme` action in `web/app/cad/actions/coreActions.js` toggles the `theme-light` class on `body`, persists the choice to `localStorage` under the key `jsketcher.theme`, and calls `viewer.updateClearColor()`. On app load, `web/app/cad/dom/components/WebApplication.jsx` restores the theme from `localStorage`.

The toggle button appears in the bottom control bar (right side) and is registered in `web/app/cad/workbench/uiConfigBundle.js`.

## Using theme values in JavaScript

The `modules/ui/styles/theme.ts` module exports a proxy object that reads CSS variables at runtime via `getComputedStyle`. This is useful when you need a color value in JavaScript (e.g. for React icon colors):

```ts
import theme from "ui/styles/theme";

<GrCubes color={theme.onColorHighlightVariantYellow} />
```

The proxy resolves the property name to the corresponding CSS variable name (e.g. `onColorHighlightVariantYellow` → `--on-color-highlight-variant-yellow`) and reads the current computed value. This means it automatically reflects the active theme.

## LESS mixins and color functions

LESS color functions like `darken()` and `lighten()` cannot operate on `var(...)` strings because they run at compile time. Instead of using these functions, define explicit dark/light variant variables (e.g. `--color-accent` and `--color-accent-dark`) and pass both to the `.button-behavior(@color; @colorDark)` mixin defined in `modules/ui/styles/mixins.less`.

# More documentation to come
