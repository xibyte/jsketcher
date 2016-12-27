export function keyCode(eventType, value) {
  const keyboardEvent = new KeyboardEvent(eventType, {bubbles:true});
  Object.defineProperty(keyboardEvent, "keyCode", {value});
  return keyboardEvent;
} 