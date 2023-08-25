//Allways keep page at propper position,
// prevents page scrolling acidentally due to html elements going out of view.
let mouseDebugger = false;

let uiElementsToggle = {
  toggleUItabs: "none",
  toggleUIoverlay: "none",
  toggleUItoolbar: "none",
};

document
  .getElementsByClassName("x-View3d-mainLayout")[0]
  .prepend(document.getElementsByClassName("x-View3d-bottomStack")[0]);

window.setInterval(function () {
  window.scrollTo(0, 0);
  setDisplayValueByClassName("x-TabSwitcher x-AppTabs-contentSwitcher small-typography disable-selection", "none");
  setDisplayValueByClassName("x-FloatView", uiElementsToggle.toggleUItabs);
  setDisplayValueByClassName("x-ControlBar mid-typography", uiElementsToggle.toggleUItoolbar);
  setDisplayValueByClassName("x-View3d-overlayingPanel", uiElementsToggle.toggleUIoverlay);
}, 200);

function setDisplayValueByClassName(clssOfItem, newDsiplayValue) {
  try {
    document.getElementsByClassName(clssOfItem)[0].style.display = newDsiplayValue;
  } catch {}
}

var mouseOverList = [];

let theToolbar = document.getElementsByClassName("x-Toolbar disable-selection condensed x-Toolbar-flat")[0];
theToolbar.style.display = "none";
theToolbar.style.position = "fixed";
theToolbar.style.left = "30px";
theToolbar.style.right = "30px";
theToolbar.style.top = "30px";
theToolbar.style.bottom = "60px";
theToolbar.style.overflow = "wrap";
theToolbar.style.borderRadius = "20px";
theToolbar.style.zIndex = "1000010";

__CAD_APP.pickControlService.pickListMode = false;
theToolbar.addEventListener(
  "click",
  function (e) {
    theToolbar.style.display = "none";
    window.parent.postMessage("showTouchpad");
  },
  false
);
//document.body.appendChild(theToolbar);
var lastMouseOverObject;
var lastThingToDo = {
  leftMouseDown: false,
  rightMouseDown: false,
};
var shiftKey = false;

let scaleFactor = 2;
let absoluteX = 0;
let absoluteY = 0;
let deltaY;
let eventType;

window.addEventListener(
  "message",
  (event) => {
    const thingToDo = event.data;
    if (typeof thingToDo !== "object") return;

    // if (thingToDo == "whatUnderTouchLocation"){
    //   return "here is my message";
    // }

    absoluteX = thingToDo.absoluteX ? thingToDo.absoluteX : "";
    absoluteY = thingToDo.absoluteY ? thingToDo.absoluteY : "";

    if (mouseDebugger) console.log(absoluteX, absoluteY);

    deltaY = thingToDo.deltaY ? thingToDo.deltaY : "";
    eventType = thingToDo.eventType ? thingToDo.eventType : "";

    if (eventType == "toggleUItabs") {
      uiElementsToggle.toggleUItabs = uiElementsToggle.toggleUItabs == "none" ? "" : "none";
      return;
    }

    if (eventType == "toggleUIoverlay") {
      uiElementsToggle.toggleUIoverlay = uiElementsToggle.toggleUIoverlay == "none" ? "" : "none";
      return;
    }

    if (eventType == "toggleUItoolbar") {
      uiElementsToggle.toggleUItoolbar = uiElementsToggle.toggleUItoolbar == "none" ? "" : "none";
      return;
    }

    if (eventType == "zoom") {
      __CAD_APP.viewer.zoomStep(deltaY);
      return;
    }

    if (eventType == "shiftDown") {
      shiftKey = true;
      const itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
      itemsUnderMouse.forEach((item, key) => {
        item.dispatchEvent(new KeyboardEvent("keydown", { shiftKey: true }));
        item.dispatchEvent(new KeyboardEvent("keypress", { shiftKey: true }));
      });
      return;
    }

    if (eventType == "shiftUp") {
      shiftKey = false;
      const itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
      itemsUnderMouse.forEach((item, key) => {
        item.dispatchEvent(new KeyboardEvent("keyup", { shiftKey: false }));
      });
      return;
    }

    if (eventType == "EscButton") {
      const itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
      if (mouseDebugger) console.log("clearing selection");
      __CAD_APP.pickControlService.deselectAll();
      itemsUnderMouse.forEach((item, key) => {
        item.dispatchEvent(new KeyboardEvent("keydown", { "key": "Escape" }));
        item.dispatchEvent(new KeyboardEvent("keypress", { "key": "Escape" }));
        item.dispatchEvent(new KeyboardEvent("keyup", { "key": "Escape" }));
      });
      __CAD_APP.pickControlService;
      return;
    }

    if (eventType == "toolsShow") {
      theToolbar.style.display = "";
    }

    if (eventType == "toolsHide") {
      theToolbar.style.display = "none";
    }

    if (lastThingToDo.leftMouseDown !== thingToDo.leftMouseDown) {
      if (thingToDo.leftMouseDown == true) {
        eventType = "leftDragStart";
      } else {
        eventType = "leftDragEnd";
      }
    }

    if (lastThingToDo.rightMouseDown !== thingToDo.rightMouseDown) {
      if (thingToDo.rightMouseDown == true) {
        eventType = "rightDragStart";
      } else {
        eventType = "rightDragEnd";
      }
    }

    if (eventType == "pickList") {
      __CAD_APP.pickControlService.pickListMode = true;
      eventType = "click";
    }

    lastThingToDo = thingToDo;

    //let stoplooping = "";

    const itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);

    doTheProperEvents(itemsUnderMouse[0]);

    // stoplooping =  doTheProperEvents(itemsUnderMouse[0]);
    // if (itemsUnderMouse[0].nodeName == "CANVAS" && stoplooping !== "stop") {
    //    itemsUnderMouse.forEach( (item, key) => {
    //     if (key !== 0) stoplooping =  doTheProperEvents(item);
    //   });
    // }

    let mouseOutObjects = [];

    let newMouseOverList = [];
    mouseOverList.forEach((item, key) => {
      if (!itemsUnderMouse.includes(item)) {
        mouseOutObjects.push(item);
      } else {
        newMouseOverList.push(item);
      }
    });

    mouseOverList = newMouseOverList;

    mouseOutObjects.forEach((item, key) => {
      exicuteEvents(item, ["mouseleave", "mouseout", "mouseexit", "pointerleave", "pointerout"]);
    });

    __CAD_APP.pickControlService.pickListMode = false;
  },
  true
);

function doTheProperEvents(item) {
  if (eventType == "mousemove") {
    exicuteEvents(item, ["mousemove", "mouseover"]);

    if (!mouseOverList.includes(item)) {
      mouseOverList.push(item);
      exicuteEvents(item, ["mouseenter", "pointerenter"]);
    }
  }

  if (eventType == "leftDragStart") {
    exicuteEvents(item, ["click", "mousedown", "pointerdown"]);
  }

  if (eventType == "leftDragEnd") {
    exicuteEvents(item, ["mouseup", "pointerup"]);
  }

  if (eventType == "rightDragStart") {
    exicuteEvents(item, ["contextmenu", "auxclick", "mousedown", "pointerdown"], { button: 2 });
  }

  if (eventType == "rightDragEnd") {
    exicuteEvents(item, ["mouseup", "pointerup"], { button: 2 });
  }

  if (eventType == "click") {
    if (item.nodeName == "INPUT") item.focus();

    exicuteEvents(item, ["click", "mousedown", "mouseup"]);
  }
  if (eventType == "dblclick") {
    if (item.nodeName == "INPUT") item.focus();

    exicuteEvents(item, ["click", "mousedown", "mouseup", "dblclick"]);
  }
  if (eventType == "rightclick") {
    exicuteEvents(item, ["contextmenu", "auxclick"]);
    exicuteEvents(item, ["click", "mousedown", "mouseup", "pointerdown", "pointerup"], { button: 2 });
  }
}

function exicuteEvent(TargetElement, eventToSend = {}) {
  eventToSend.clientX = absoluteX;
  eventToSend.clientY = absoluteY;
  eventToSend.x = absoluteX;
  eventToSend.y = absoluteY;
  eventToSend.pageX = absoluteX;
  eventToSend.pageY = absoluteY;
  eventToSend.view = window;
  eventToSend.bubbles = true;
  eventToSend.cancelable = true;
  eventToSend.shiftKey = shiftKey;

  eventToSend = new MouseEvent(eventToSend.type, eventToSend);
  try {
    testResult = TargetElement.dispatchEvent(eventToSend);
    if (mouseDebugger) if (!testResult) console.log("event trigger failed", testResult, TargetElement, eventToSend);
    //if (TargetElement.dispatchEvent(eventToSend) == false) console.log("event trigger failed", TargetElement, eventToSend);
    return testResult;
  } catch {
    if (mouseDebugger) console.log("event trigger failed", TargetElement, eventToSend);
    return "failed";
  }
}

function exicuteEvents(TargetElement, eventTypes, eventToSend = {}) {
  const eventTemplate = JSON.parse(JSON.stringify(eventToSend));
  eventTypes.forEach((enenvtToFire, key) => {
    eventTemplate.type = enenvtToFire;
    exicuteEvent(TargetElement, eventTemplate);
  });
}
