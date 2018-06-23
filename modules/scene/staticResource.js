
const STATIC_RESOURCES = [];

export default function staticResource(resource) {
  STATIC_RESOURCES.push(resource);
  return resource;
}

window.addEventListener("beforeunload", function() {
  STATIC_RESOURCES.forEach(r => r.dispose());
}, false);
