import GridOnIcon from "@mui/icons-material/GridOn";
import {SvgIconTypeMap} from "@mui/material";
import {OverridableComponent} from "@mui/material/OverridableComponent";

export type GeneralSettingsActionType = "boolean" | "number" | "select";

export type GeneralSettingsType = {
    id: string;
    title: string;
    type: GeneralSettingsActionType;
    options?: Record<string, string>;
    initialValue?: any;
    IconComponent: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
};

type GeneralSettingsMenuType = {
    id: string;
    title: string;
    settings: GeneralSettingsType[];
};

export const generalSettings: GeneralSettingsMenuType[] = [
    {
        id: "scene",
        title: "Scene",
        settings: [
            {
                id: "gridVisible",
                title: "Grid Visible",
                type: "boolean",
                IconComponent: GridOnIcon,
                initialValue: true,
            },
            {
                id: "groundShadow",
                title: "Ground shadow",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "viewCubeVisible",
                title: "Viewcube visible",
                type: "boolean",
                IconComponent: GridOnIcon,
                initialValue: true,
            },
            {
                id: "minimapVisible",
                title: "Minimap Visible",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "minimapZoom",
                title: "Minimap zoom",
                type: "number",
                IconComponent: GridOnIcon,
            },
            {
                id: "culling",
                title: "Culling",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "ambientOclussion",
                title: "Ambient oclussion",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "glossiness",
                title: "Glossiness",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "outlines",
                title: "Outlines",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "units",
                title: "Units",
                type: "select",
                options: {
                    fileUnits: "File units",
                    meters: "Meters",
                    milimeters: "Milimeters",
                    inches: "Inches",
                    feet: "Feet",
                },
                initialValue: "fileUnits",
                IconComponent: GridOnIcon,
            },
        ],
    },
    {
        id: "navigation",
        title: "Navigation",
        settings: [
            {
                id: "zoomToCursor",
                title: "Zoom to cursor",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "zoomBeyondTarget",
                title: "Zoom beyond target",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "dragSpeed",
                title: "Drag speed",
                type: "number",
                IconComponent: GridOnIcon,
            },
            {
                id: "zoomSpeed",
                title: "Zoom speed",
                type: "number",
                IconComponent: GridOnIcon,
            },
        ],
    },
    {
        id: "selection",
        title: "Selection",
        settings: [
            {
                id: "selectFill",
                title: "Select fill",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "selectOutline",
                title: "Select outline",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
            {
                id: "multiSelect",
                title: "Shift to select multiple",
                type: "select",
                options: {
                    none: "None",
                    shiftKey: "Shift",
                    ctrlKey: "Control",
                },
                initialValue: "ctrlKey",
                IconComponent: GridOnIcon,
            },
            {
                id: "zoomToSelection",
                title: "Zoom to selection",
                type: "boolean",
                IconComponent: GridOnIcon,
            },
        ],
    },
];

export default generalSettings;
