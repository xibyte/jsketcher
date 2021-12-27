# Welcome to the JSketcher workbench developer guide!

This guide will describe how to create work bench commands and dialogs used as steps in the part history. JSKetcher provides a standard way to define new part history commands that create both the new feature geometry and track the user input fields for a particular command. Input fields are standard user interface elements providing text boxes, numeric inputs and drop downs in addition to rich intelligent geometry selection widgets for sketches, edges, faces, ect.

JSketcher provides a structured mechanism for tracking part history operations and their related inputs. This history can be though of a short program. Each step in the series can generate new geometry and build off of references to the previous steps. Tracking IDs of geometry such as edges, faces and bodies is handled automatically and UI widgets are provided for the selection of these entities from feature command dialogs.

All part history feature commands are added to a folder where you define the:
 - Command UI data model
 - Command execution code
 - Help file documentation for command
 - Icon file for toolbars and part history



## Files

When developing or extending existing workbenches each command needs its own folder under the workbench features folder. 

**Template**: jsketcher/workbenches/**{work_bench_name}**/features/**{Feature_Name}**/
**Example** : "jsketcher/workbenches/modeler/features/primitive_box/"

jsketcher/workbenches/modeler/features/primitive_box/index.ts
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
 - **run**: This is the actual code that will be executed when the preview button or the "OK" button in the feature dialog is pressed. The values defined in the schema are passed in and can be referenced by the simplified OpenCASCADE api provided by the JSKetcher OpenCASCADE wasm interface library. You can find more information about the functions exposed by this here (Add link to library docs here).  
 
 **Example index.ts file**:
```
import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { createOCCBottle } from './bottle.occ';
import { occ2brep } from 'cad/occ/occ2models';
import icon from './icon.svg';

export default {
    id: 'OCC_BOTTLE',
    label: 'OCC Bottle',
    info: 'create occ bottle',
    icon: {
        iconType: 'svg',
        iconContent: icon
    },

    paramsInfo: ({ width, height, thickness, color }) => `(${r(width)} ${r(height)} ${r(thickness)}  ${r(color)})`,
    schema: {
        width: {
            type: 'number',
            defaultValue: 200,
            label: 'width'
        },
        height: {
            type: 'number',
            defaultValue: 280,
            label: 'height'
        },
        thickness: {
            type: 'number',
            min: 0,
            label: 'thickness',
            defaultValue: 150
        },
        color: {
            type: 'select',
            defaultValue: "red",
            label: 'Color',
            options: [
                {
                    label: 'Red',
                    value: 'red'
                },
                {
                    label: 'Green',
                    value: 'green'
                },
            ],
        },
    },
    run: ({ width, height, thickness, color }, ctx: ApplicationContext) => {
        const occObj = createOCCBottle(width, height, thickness, ctx.occService.occContext);
        const mobject = new MBrepShell(occ2brep(occObj, ctx.occService.occContext));
        console.log(color);
        return {
            consumed: [],
            created: [mobject]
        };
    }
}

```

## Schema fields widget types
The following widgets are provided to allow rapid development of new modeling feature types. The schema is used to build the stack of UI elements show to the user when a new feature is being added or edited. 

Normal Form widgets for values:
 - **[string](#string-widget)**
 - **[number](#number-widget)**
 - **[boolean](#number-widget)**
 - **select**

Special widgets for interaction with 3d geometry:
 - **[face](#face-widget)**
 - **[edge](#edge-widget)**
 - **[sketchObject](#sketchObject-widget)**
 - **[datumAxis](#datumAxis-widget)**
 - **[body](#body-widget)**
 - **[bodyBoolean](#bodyBoolean-widget)**

Organization:
 - **[image](#image-widget)**
 - **[text](#text-widget)** 

Example of adding a field to the schema. What ever order you place the items in the schema is the order they will be displayed in the resulting dialog.
```
export default {
	//. . .
    schema: {
		//fields go here
        width: {
            type: 'number',
            defaultValue: 200,
            label: 'width'
        },
	}
    //. . . 
}
```


### string widget
A simple text entry text entry field. 
Returns a string.
```
        someText: {
            type: 'string',
            defaultValue: "strings are great",
            label: 'A string input here'
        },
```
### number widget
A simple numeric value entry field. 
Optionally if style property is set can be used as a spinner or slider instead of the regular textbox if left undefined.
Returns a string.
```
        width: {
            type: 'number',
            style: "slider", //optional modifer to set the input style
            defaultValue: 200,
            minValue: 0, //Required for spinner or slider styles only
            maxValue: 500, //Required for spinner or slider styles only
            label: 'width'
        },
```
### boolean widget
A simple checkbox. 
Returns a true or false value.
```
        round Corners: {
            type: 'boolean',
            defaultValue: false,
            label: 'Rounded corners'
        },
```
### select widget
A drop-down menu listing options. 
Returns a string with the selected options value.
```
        color: {
            type: 'select',
            defaultValue: "red",
            label: 'Color',
            options: [
                {
                    label: 'Red',
                    value: 'red'
                },
                {
                    label: 'Green',
                    value: 'green'
                },
            ],
        },
```
### face widget
Allows for selection of one or more faces of displayed bodies in the 3d view.
Returns an array of strings with face IDs.
### edge widget
Allows for selection of one or more edges of displayed bodies in the 3d view.
Returns an array of strings with edge IDs. 
### sketchObject widget
Allows for selection of one or more sketches from the displayed objects in the 3d view.
Returns an array of strings with sketch IDs
### datumAxis widget
Allows for selection of one or more datum features from the displayed objects in the 3d view.
Returns an array of strings with datum IDs.
### body widget
Allows for selection of one or more bodies in the 3d view.
Returns an array of strings with body IDs.
### bodyBoolean widget
A drop down menu specific to the target of a boolean operation against bodies. Allows for the user to select "None", "Unite", "Subtract" or "Intersect".
Returns a string with the the selected value ("none", "unite", "subtract" or "intersect").
### image widget
Allows for an image to be inserted in to the command dialog to illustrate a commands intent. For example you might show an illustration of what each parameter the user sets would be used in generating a feature.
### text widget
Allows for text to be added to the dialog with instructions or more sophisticated descriptions of an operation to be shown to the user. 


## paramsInfo tool tip information 
The paramsInfo section is used to define a string that shows up when you mouse over a feature from the time line. You can pass in items defined in the schema and use them to form the string template for the tool top text. The tooltip text is displayed when mousing over the feature in the part history. 
```
export default {
	//. . .
    paramsInfo: ({ length, lidth, height }) => `(Cube - Size: ${r(length)}, ${r(width)}, ${r(height)})`,
    //. . . 
}
```
