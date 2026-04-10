import {GeometricEntity, generateEntityId} from '../GeometricEntity';

/**
 * A generic collection of entities.
 * Used to group surfaces that belong to the same primitive or operation result.
 */
export class Group extends GeometricEntity {

  name: string;

  constructor(name: string = '') {
    super(generateEntityId('G'));
    this.name = name;
  }
}
