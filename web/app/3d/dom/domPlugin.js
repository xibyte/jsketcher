export function activate(context) {
  context.services.dom = {
    viewerContainer: document.getElementById('viewer-container')
  };
}

