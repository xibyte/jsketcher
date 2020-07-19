import {StreamBase} from './base';
import {NOOP} from '../gems/func';

export class NeverStream extends StreamBase {

  attach(observer) {
    return NOOP;
  }
}

NeverStream.INSTANCE = new NeverStream();

