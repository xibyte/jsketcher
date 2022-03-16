import {LazyStreams} from "lstream/lazyStreams";
import {state} from "lstream";

export interface ModelAttributes {
  hidden: boolean;
  label: string;
  color: string;
}

export class AttributesService {

  streams = new LazyStreams<ModelAttributes>(id => ({
    hidden: false,
    label: null,
    color: null
  }));

  displayOptionsEditors$ = state<EditorSet>({});

  attributesEditors$ = state<EditorSet>({});

  openDisplayOptionsEditor(modelIds: string[], e: any) {
    this.displayOptionsEditors$.mutate(editors => {
      const copy = [...modelIds].sort();
      editors[copy.join(':')] = {
        x: e.pageX,
        y: e.pageY,
        models: copy
      };
    });
  }

}

export type EditorSet = {
  [key: string]: {
    x: number,
    y: number,
    models: string[]
  }
}

