// The desktop owns file permissions and dialogs. These messages are only
// requests; the embedding host must verify the origin and frame source.
export const desktopFileMode = new URLSearchParams(window.location.search).get('webos') === '1';

export function requestDesktopFileAction(action) {
  if (!desktopFileMode || window.parent === window) {
    throw new Error('The desktop file service is unavailable.');
  }
  if (!['open', 'save', 'save-as', 'import-dxf'].includes(action)) throw new Error('Unknown desktop file action.');
  window.parent.postMessage({codiJSketcher: {type: 'file-action', action}}, window.location.origin);
}
