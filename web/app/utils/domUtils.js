
export function createElement(type, id, className, text) {
  const el = document.createElement(type);
  if (id) {
    el.id = id;
  }
  if (className) {
    el.className = className;
  }
  if (text) {
    el.innerText = text;
  }
  return el;
}

export function select(query) {
  return document.querySelector(query)
}

export function selectAll(query) {
  return document.querySelectorAll(query)
}

