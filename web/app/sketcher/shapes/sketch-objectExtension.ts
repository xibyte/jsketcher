import {SketchObject} from './sketch-object';

declare module './sketch-object' {
  interface SketchObject {

    TYPE: string;


    /**
     * @deprecated use TYPE instead
     */
    _class: string;
  }
}