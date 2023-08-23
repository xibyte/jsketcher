pointerImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeAQMAAAAB/jzhAAAABlBMVEX/AAAAAABBoxIDAAAAAnRSTlP/AOW3MEoAAABISURBVHicPc6xCQAgDETRhBQpM0JGyWjBTR3BAQTlW9g8uOK4kz5nS0FCgIOBgjwaChICHAwU5NFQkBDgYKA//hroYHdyY/W+8QFAUbYNynAAAAAASUVORK5CYII=";

document.body.innerHTML += `
  <svg id="cursor" xmlns="http://www.w3.org/2000/svg" viewBox="-10003 -10003 20010 20010">
  <path d="M 0 0 L 0 10000 Z M 0 0 L 0 -10000 M 0 0 L -10000 0 M 0 0 L 10000 0 M 25 0 A 1 1 0 0 0 -25 0 A 1 1 0 0 0 25 0" stroke="black" stroke-width="3" fill="none"/>
  </svg>`;

cursor = document.getElementById("cursor");
cursor.style.width = "100px";
cursor.style.height = "100px";

ActiveButtonBackgroundColor = "rgba(252, 242, 44, 0.3)";
InactiveButtonBackgroundColor = "rgba(100, 94, 94, 0.4)";

const FakeMouseHolderDiv = document.getElementById("FakeMouseHolder");
const holderHolder = document.getElementById("holderHolder");

const mouseObject = {
  leftMouseDown: false,
  rightMouseDown: false,
  absoluteX: 100,
  absoluteY: 100,
  deltaY: 0,
  shiftKey: false,
  pickListMode: true,
};

var lastTouchX = 0;
var lastTouchY = 0;

var speed = 0.6;

const pointerTarget = document.getElementById("jsketcher").contentWindow;
function sendNewEvent(eventType) {
  let obj = JSON.parse(JSON.stringify(mouseObject));
  obj.eventType = eventType;
  //console.log("sending this", obj);
  pointerTarget.postMessage(obj);
}

document.getElementById("touchpadArea").addEventListener("touchstart", function (event) {
  //document.body.requestFullscreen();
  console.log(event.touches);

  if (event.touches.length == 1){
    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
  }

  if (event.touches.length ==2){
    lastScrollY = event.touches[0].clientY;
    zooming = true;
    event.preventDefault();
  
  }

});


document.getElementById("touchpadArea").addEventListener("touchend", function (event) {
  if (event.touches.length ==2){
    zooming = false;
    mouseObject.deltaY = 0;
    lastScrollY = 0;
    event.preventDefault();
  }
});

document.getElementById("touchpadArea").addEventListener("click", function (event) {
  document.getElementById("leftMouseButton").click();
});

document.getElementById("touchpadArea").addEventListener("dblclick", function (event) {
  event.preventDefault();
  //document.getElementById("leftMouseButton").click();
  sendNewEvent("dblclick");
});

document.getElementById("touchpadArea").addEventListener("contextmenu", function (event) {
  event.preventDefault();
  document.getElementById("leftMouseButton").dispatchEvent(new CustomEvent("contextmenu"));
});

document.getElementById("touchpadArea").addEventListener("touchmove", function (event) {
  event.preventDefault();
  if (event.touches.length == 1){
    let x = event.touches[0].clientX;
    let y = event.touches[0].clientY;
  
    let difrenceX = x - lastTouchX;
    let difrenceY = y - lastTouchY;
  
    lastTouchX = x;
    lastTouchY = y;
  
    mouseObject.absoluteX = mouseObject.absoluteX + difrenceX * speed;
    mouseObject.absoluteY = mouseObject.absoluteY + difrenceY * speed;
  
    mouseObject.absoluteX = mouseObject.absoluteX > 0 ? mouseObject.absoluteX : 1;
    mouseObject.absoluteY = mouseObject.absoluteY > 0 ? mouseObject.absoluteY : 1;
  
    cursor.style.left = mouseObject.absoluteX + "px";
    cursor.style.top = mouseObject.absoluteY + "px";
  
    sendNewEvent("mousemove");
  }

  if (event.touches.length == 2){
    //zoom zoom zoom
    console.log("zoom zoom zoom")

    let y = event.touches[0].clientY;
    let difrenceY = y - lastScrollY;
    lastScrollY = y;
    mouseObject.deltaY = difrenceY / 10000;
    sendNewEvent("zoom");
  }
});

document.getElementById("leftMouseButton").addEventListener("contextmenu", function (event) {
  event.preventDefault();
  if (event.target.innerHTML == "🔒") {
    event.target.innerHTML = "🔓";
    mouseObject.leftMouseDown = false;
    event.target.style.backgroundColor = InactiveButtonBackgroundColor;
    sendNewEvent("mousemove");
  } else {
    event.target.innerHTML = "🔒";
    mouseObject.leftMouseDown = true;
    event.target.style.backgroundColor = ActiveButtonBackgroundColor;
    sendNewEvent("mousemove");
  }
});

document.getElementById("rightMouseButton").addEventListener("contextmenu", function (event) {
  event.preventDefault();
  if (event.target.innerHTML == "🔒") {
    event.target.innerHTML = "🔓";
    mouseObject.rightMouseDown = false;
    event.target.style.backgroundColor = InactiveButtonBackgroundColor;
    sendNewEvent("mousemove");
  } else {
    event.target.innerHTML = "🔒";
    mouseObject.rightMouseDown = true;
    event.target.style.backgroundColor = ActiveButtonBackgroundColor;
    sendNewEvent("mousemove");
  }
});

document.getElementById("leftMouseButton").addEventListener("click", function (event) {
  event.preventDefault();
  if (event.target.innerHTML == "🔒") {
    event.target.innerHTML = "🔓";
    mouseObject.leftMouseDown = false;
    event.target.style.backgroundColor = InactiveButtonBackgroundColor;
    sendNewEvent("mousemove");
  }
  doLeftClick();
});

document.getElementById("rightMouseButton").addEventListener("click", function (event) {
  event.preventDefault();
  if (event.target.innerHTML == "🔒") {
    event.target.innerHTML = "🔓";
    mouseObject.rightMouseDown = false;
    event.target.style.backgroundColor = InactiveButtonBackgroundColor;
    sendNewEvent("mousemove");
  }else{
    doRightClick();
  }
});

document.getElementById("pickList").addEventListener("click", function (event) {
  sendNewEvent("pickList");
});

document.getElementById("ShiftButton").addEventListener("click", function (event) {
  event.preventDefault();
  if (event.target.innerHTML == "shift") {
    event.target.innerHTML = "shift Down";
    event.target.style.backgroundColor = ActiveButtonBackgroundColor;
    mouseObject.shiftKey = true;
    sendNewEvent("shiftDown");
  } else {
    event.target.innerHTML = "shift";
    event.target.style.backgroundColor = InactiveButtonBackgroundColor;
    mouseObject.shiftKey = false;
    sendNewEvent("shiftUp");
  }
});

document.getElementById("toolsShow").addEventListener("click", function (event) {
  event.preventDefault();
  sendNewEvent("toolsShow");
  toggleMousepad("hide");
});

document.getElementById("EscButton").addEventListener("click", function (event) {
  event.preventDefault();
  sendNewEvent("EscButton");
});

function toggleMousepad(showHide) {
  if (showHide) {
    if (showHide == "show") holderHolder.style.display = "block";
    if (showHide == "hide") holderHolder.style.display = "none";
    return;
  }

  if (holderHolder.style.display == "none") {
    sendNewEvent("toolsHide");
    holderHolder.style.display = "block";
  } else {
    holderHolder.style.display = "none";
  }
}

function doLeftClick() {
  sendNewEvent("click");
}

function doRightClick() {
  sendNewEvent("rightclick");
}

var lastScrollY = 0;
var zooming = false;

document.getElementById("ScrollWheel").addEventListener("touchstart", function (event) {
  lastScrollY = event.touches[0].clientY;
  zooming = true;
  event.preventDefault();
});

document.getElementById("ScrollWheel").addEventListener("touchend", function (event) {
  zooming = false;
  mouseObject.deltaY = 0;
  lastScrollY = 0;
  event.preventDefault();
});

document.getElementById("ScrollWheel").addEventListener("touchmove", async function (event) {
  let y = event.touches[0].clientY;
  let difrenceY = y - lastScrollY;
  lastScrollY = y;
  mouseObject.deltaY = difrenceY / 10000;
  sendNewEvent("zoom");
  event.preventDefault();
});

window.addEventListener("message", function (event) {
  console.log("Message received from the child: " + event.data); // Message received from child
  if (event.data == "showTouchpad") toggleMousepad("show");
});

var iframe = document.getElementById("jsketcher");

iframe.onload = function () {
  const elem = document.createElement(`script`);
  elem.src = "./mouse/virtualMousePointer.js";

  iframe.contentDocument.body.appendChild(elem);

  console.log(window.location);
};

document.body.onload = function () {
  try {
    document.getElementById("mouseSpeed").value = localStorage.mouseSpeed;
  } catch {}
  iframe.src = "./" + window.location.search;
  //console.log("dats the window locations", window.location.search);
};

document.getElementById("saveSettings").onclick = function (event) {
  localStorage.mouseSpeed = document.getElementById("mouseSpeed").value;
  speed = localStorage.mouseSpeed;
  document.getElementById("settings").style.display = "none";
  //console.log("dats the window locations", window.location.search);
};

document.getElementById("toggleUItabs").onclick = function (event) {
  sendNewEvent("toggleUItabs");
};

document.getElementById("toggleUIoverlay").onclick = function (event) {
  sendNewEvent("toggleUIoverlay");
};

document.getElementById("toggleUItoolbar").onclick = function (event) {
  sendNewEvent("toggleUItoolbar");
};

document.getElementById("settingsButton").onclick = function (event) {
  document.getElementById("settings").style.display = "";
  //console.log("dats the window locations", window.location.search);
};
