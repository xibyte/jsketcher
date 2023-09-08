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
  document.body.scrollIntoView();
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
  async (event) => {
    const thingToDo = event.data;
    if (typeof thingToDo !== "object") return;
    console.log(thingToDo);

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
      afterActionDoAnyCleanup();
      return;
    }

    if (eventType == "toggleUIoverlay") {
      uiElementsToggle.toggleUIoverlay = uiElementsToggle.toggleUIoverlay == "none" ? "" : "none";
      afterActionDoAnyCleanup();
      return;
    }

    if (eventType == "toggleUItoolbar") {
      uiElementsToggle.toggleUItoolbar = uiElementsToggle.toggleUItoolbar == "none" ? "" : "none";
      afterActionDoAnyCleanup();
      return;
    }

    if (eventType == "zoom") {
      __CAD_APP.viewer.zoomStep(deltaY);
      afterActionDoAnyCleanup();
      return;
    }

    if (eventType == "shiftDown") {
      shiftKey = true;
      const itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
      itemsUnderMouse.forEach((item, key) => {
        item.dispatchEvent(new KeyboardEvent("keydown", { shiftKey: true }));
        item.dispatchEvent(new KeyboardEvent("keypress", { shiftKey: true }));
      });
      afterActionDoAnyCleanup();
      return;
    }

    if (eventType == "shiftUp") {
      shiftKey = false;
      const itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
      itemsUnderMouse.forEach((item, key) => {
        item.dispatchEvent(new KeyboardEvent("keyup", { shiftKey: false }));
      });
      afterActionDoAnyCleanup();
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
      afterActionDoAnyCleanup();
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
    let itemsUnderMouse = [];
    if (thingToDo.actualrealTouchlocation.x > 0) {
      let itemsUnderFinger = document.elementsFromPoint(
        thingToDo.actualrealTouchlocation.x,
        thingToDo.actualrealTouchlocation.y
      );
      console.log(itemsUnderFinger);
      let clickPassthrouch = false;
      await itemsUnderFinger.forEach(
        await async function (item, key) {
          //alert(clickPassthrouch);
          if (item.className == "x-ContextualControls") clickPassthrouch = true;
          if (item.className == "x-Window mid-typography Wizard") clickPassthrouch = true;
        }
      );
      if (clickPassthrouch) {
        absoluteX = thingToDo.actualrealTouchlocation.x;
        absoluteY = thingToDo.actualrealTouchlocation.y;
      }
      itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
    } else {
      itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
    }

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
    afterActionDoAnyCleanup();
    __CAD_APP.pickControlService.pickListMode = false;
  },
  true
);

function afterActionDoAnyCleanup() {
  document.body.scrollIntoView();
}

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

    if (item.nodeName == "SELECT") {
      createDropdownDiv(item);
      return;
    }

    console.log("clicking", item);

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

function createDropdownDiv(selectElem) {
  // Check if the provided element is a select element
  if (selectElem.tagName !== "SELECT") {
    console.error("Provided element is not a select element.");
    return;
  }

  // Hide the select element
  selectElem.style.display = "none";

  // Create the div
  const div = document.createElement("div");
  div.style.border = "1px solid #ccc";
  div.style.padding = "10px";
  div.style.width = "200px"; // You can adjust this or any other styles as needed

  // Populate the div with the select's options
  selectElem.querySelectorAll("option").forEach((option) => {
    const clickableElem = document.createElement("div");
    clickableElem.textContent = option.textContent;
    clickableElem.style.cursor = "pointer";
    clickableElem.style.padding = "5px";

    // Highlight the current selected option in blue
    if (option.value === selectElem.value) {
      clickableElem.style.backgroundColor = "blue";
      clickableElem.style.color = "white";
    }

    clickableElem.addEventListener("click", () => {
      selectElem.value = option.value; // Set the select's value

      // Dispatch a change event to inform the browser of the value change
      const changeEvent = new Event("change", {
        "bubbles": true,
        "cancelable": true,
      });
      selectElem.dispatchEvent(changeEvent);

      div.remove(); // Remove the div from the DOM
      selectElem.style.display = ""; // Show the select element again
    });

    div.appendChild(clickableElem);
  });

  // Insert the div immediately after the select element
  selectElem.insertAdjacentElement("afterend", div);
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
