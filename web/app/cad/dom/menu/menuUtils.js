export const menuAboveElementHint = el => {
  const {top, left} = el.getBoundingClientRect();
  return ({
    orientationUp: true,
    flatBottom: true,
    x: left,
    y: document.documentElement.clientHeight - top
  });
};

export const menuBelowElementHint = el => {
  const {bottom, left} = el.getBoundingClientRect();
  return ({
    orientationUp: false,
    flatBottom: false,
    x: left,
    y: bottom
  });
};