//Allways keep page at propper position,
// prevents page scrolling acidentally due to html elements going out of view.
var intervalId = window.setInterval(function () {
  window.scrollTo(0, 0);

  document.getElementsByClassName("x-ControlBar mid-typography")[0].style.display = "none";
  document.getElementsByClassName(
    "x-TabSwitcher x-AppTabs-contentSwitcher small-typography disable-selection"
  )[0].style.display = "none";
  document.getElementsByClassName("x-View3d-overlayingPanel")[0].style.display = "none";

  document.getElementsByClassName("x-FloatView")[0].style.display = "none";
  document.getElementsByClassName("x-View3d-overlayingPanel")[0].style.display = "none";
}, 200);

theToolbar = document.getElementsByClassName("x-Toolbar disable-selection condensed x-Toolbar-flat")[0];
theToolbar.style.display = "none";
theToolbar.style.position = "fixed";
theToolbar.style.left = "30px";
theToolbar.style.right = "30px";
theToolbar.style.top = "30px";
theToolbar.style.bottom = "60px";
theToolbar.style.overflow = "wrap";
theToolbar.style.borderRadius = "20px";
theToolbar.style.zIndex = "1000010";
//theToolbar.style.pointerEvents = "initial";

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

window.addEventListener(
  "message",
  (event) => {
    const thingToDo = event.data;
    if (typeof thingToDo !== "object") return;

    absoluteX = thingToDo.absoluteX ? thingToDo.absoluteX : "";
    absoluteY = thingToDo.absoluteY ? thingToDo.absoluteY : "";
    deltaY = thingToDo.deltaY ? thingToDo.deltaY : "";
    eventType = thingToDo.eventType ? thingToDo.eventType : "";

    if (eventType == "zoom") {
      //console.log(deltaY);
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
      console.log("clearing selection");

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

    stoplooping = "";

    if (eventType) {
      const itemsUnderMouse = document.elementsFromPoint(absoluteX, absoluteY);
      stoplooping = doTheProperEvents(itemsUnderMouse[0]);

      if (itemsUnderMouse[0].nodeName == "CANVAS" && stoplooping !== "stop") {
        itemsUnderMouse.forEach((item, key) => {
          if (key !== 0) stoplooping = doTheProperEvents(item);
        });
      }
    }

    __CAD_APP.pickControlService.pickListMode = false;
  },
  false
);

function doTheProperEvents(item) {
  exicuteEvent(item, {
    type: "mouseover",
    view: window,
    bubbles: true,
    cancelable: true,
    absoluteX,
    absoluteY,
  });

  exicuteEvent(item, {
    type: "mouseenter",
    view: window,
    bubbles: true,
    cancelable: true,
    absoluteX,
    absoluteY,
  });

  exicuteEvent(item, {
    type: "mousemove",
    view: window,
    bubbles: true,
    cancelable: true,
    absoluteX,
    absoluteY,
  });

  if (eventType == "leftDragStart") {
    exicuteEvent(item, {
      type: "click",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });

    exicuteEvent(item, {
      type: "mousedown",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });
  }

  if (eventType == "leftDragEnd") {
    exicuteEvent(item, {
      type: "mouseup",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });
  }

  if (eventType == "rightDragStart") {
    exicuteEvent(item, {
      type: "contextmenu",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });
    exicuteEvent(item, {
      type: "auxclick",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "click",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "mousedown",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "pointerdown",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });
  }

  if (eventType == "rightDragEnd") {
    exicuteEvent(item, {
      type: "mouseup",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "pointerup",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });
  }

  if (eventType == "click") {
    // try {
    //   item.click();
    // } catch {console.log("click failed")}

    if (item.nodeName == "INPUT") {
      item.focus();
    }

    if (item.nodeName == "SELECT") {
      item.focus();
      //alert("WE HGAVE SELECT")
      item.dispatchEvent(new MouseEvent("click"));

      //item.attr('size',5);
      item.setAttribute("size", 10);
      item.style.appearance = "";
      item.style.overflow = "auto";
    }

    exicuteEvent(item, {
      type: "click",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });

    exicuteEvent(item, {
      type: "mousedown",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });

    exicuteEvent(item, {
      type: "mouseup",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });
  }

  if (eventType == "dblclick") {
    // try {
    //   item.click();
    // } catch {console.log("click failed")}

    if (item.nodeName == "INPUT") {
      item.focus();
    }

    exicuteEvent(item, {
      type: "click",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });

    exicuteEvent(item, {
      type: "dblclick",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });
  }

  if (eventType == "rightclick") {
    exicuteEvent(item, {
      type: "contextmenu",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });
    exicuteEvent(item, {
      type: "auxclick",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
    });

    exicuteEvent(item, {
      type: "click",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "mousedown",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "mouseup",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "pointerdown",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });

    exicuteEvent(item, {
      type: "pointerup",
      view: window,
      bubbles: true,
      cancelable: true,
      absoluteX,
      absoluteY,
      button: 2,
    });
  }
}

function exicuteEvent(TargetElement, eventToSend) {
  //console.log(eventToSend);
  eventToSend.clientX = eventToSend.absoluteX;
  eventToSend.clientY = eventToSend.absoluteY;
  eventToSend.x = eventToSend.absoluteX;
  eventToSend.y = eventToSend.absoluteY;
  eventToSend.pageX = eventToSend.absoluteX;
  eventToSend.pageY = eventToSend.absoluteY;

  eventToSend.shiftKey = shiftKey;

  eventToSend = new MouseEvent(eventToSend.type, eventToSend);

  try {
    TargetElement.dispatchEvent(eventToSend);
    //if (TargetElement.dispatchEvent(eventToSend) == false) console.log("event trigger failed", TargetElement, eventToSend);
  } catch {
    console.log("event trigger failed", TargetElement, eventToSend);
    return "failed";
  }
}
