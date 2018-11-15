import Vector from './vector';
import {Vector3} from 'three';

export const arrToThree = arr => new Vector3().fromArray(arr);
export const arrToVector = arr => new Vector().set3(arr);
export const threeToVector = threeV => new Vector().set(threeV);

