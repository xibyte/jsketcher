export const menuAboveElementHint = el => {
  const {top, left, bottom} = el.getBoundingClientRect();
  return ({
    orientationUp: true,
    flatBottom: true,
    x: left,
    y: document.documentElement.clientHeight - top
  });
};
