import {LazyStreams} from "lstream/lazyStreams";

export class AttributesService {

  streams = new LazyStreams<ModelAttributes>(id => ({
    hidden: false,
    label: null,
    color: null
  }));

}

export interface ModelAttributes {
  hidden: boolean;
  label: string;
  color: string;
}


