
export function showDialogRequestFromEvent<P, R>(e, {payload, offset = 10, onDone} :{
    payload?: P,
    offset?: number,
    onDone: (R) =>  void}): ShowDialogRequest<P, R> {
  return {
    payload,
    onDone,
    x: e.pageX + offset,
    y: e.pageY + offset
  }
}

export interface ShowDialogRequest<P, R> {

  payload?: P;
  x?: number;
  y?: number;
  centerScreen?: boolean,
  onDone: (R) => void


}
