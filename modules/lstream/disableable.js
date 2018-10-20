import {StateStream} from './state';

export class DisableableState extends StateStream {

  disabled = false;
  
  next(value) {
    if (!this._disabled) {
      super.next(value);
    }
  }
}