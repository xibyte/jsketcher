
export const SKETCHER_STORAGE_PREFIX = "TCAD.projects.";

export class Project {

  constructor(viewer) {
    this.viewer = viewer;
  }

  cloneSketch() {
    const name = prompt("Name for sketch clone");
    if (name != null) {
      if (this.isSketchExists(name)) {
        alert("Sorry, a sketch with the name '" + name + "' already exists. Won't override it.");
        return;
      }
      localStorage.setItem(SKETCHER_STORAGE_PREFIX + name, this.viewer.io.serializeSketch());
      this.openSketch(name);
    }
  }

  isSketchExists(name) {
    return localStorage.getItem(SKETCHER_STORAGE_PREFIX + name) != null;
  }

  openSketch(name) {
    let uri = window.location.href.split("#")[0];
    if (name !== "untitled") {
      uri += "#" + name;
    }
    const win = window.open(uri, '_blank');
    win.focus();
  }

  newSketch() {
    const name = prompt("Name for sketch");
    if (name != null) {
      if (this.isSketchExists(name)) {
        alert("Sorry, a sketch with the name '" + name + "' already exists. Won't override it.");
        return;
      }
      this.openSketch(name);
    }
  }

  loadFromLocalStorage() {
    const sketchId = this.getSketchId();
    const sketchData = localStorage.getItem(sketchId);
    if (sketchData != null) {
      this.viewer.historyManager.init(sketchData);
      this.viewer.io.loadSketch(sketchData);
    }
    this.viewer.repaint();
  }

  getSketchId() {
    let id = window.location.hash.substring(1);
    if (!id) {
      id = "untitled";
    }
    return SKETCHER_STORAGE_PREFIX + id;
  }

}

