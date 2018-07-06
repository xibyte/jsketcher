export const menuAboveElementHint = el => ({
  orientationUp: true,
  flatBottom: true,
  x: el.offsetParent.offsetParent.offsetLeft + el.offsetLeft,
  y: el.offsetParent.offsetHeight - el.offsetTop
});
