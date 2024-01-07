export interface EditorAction {
    actionIcon: string;
    actionId: string;
    actionName: string;
    enabled: boolean;
    toolIcon: string;
    toolId: string;
}

export interface EditorToolbar {
    id: string;
    name: string;
    actions: EditorAction[];
}

export interface EditorToolbarConfig {
    top: EditorToolbar[];
    bottom: EditorToolbar[];
    left: EditorToolbar[];
    right: EditorToolbar[];
}

export const mainToolbarName = "toc-editor-main-tooblar";
