    // check for common mobile user agents
    if (
        navigator.userAgent.match(/Android/i) ||
        navigator.userAgent.match(/webOS/i) ||
        navigator.userAgent.match(/iPhone/i) ||
        navigator.userAgent.match(/iPad/i) ||
        navigator.userAgent.match(/iPod/i) ||
        navigator.userAgent.match(/BlackBerry/i) ||
        navigator.userAgent.match(/Windows Phone/i)
      ) {
        // the user is using a mobile device, so redirect to the mobile version of the website
        try {
          //detect iframe parent and see if it is the mobile mouse
          //if frame is loaded in mouse page do nothing otherwise redirect to mouse page
          if ( window.location.pathname == window.parent.location.pathname ) {
            //test if parent is mobile mouse emulator page and redirect if not
            if (!window.parent.location.pathname.includes("/mouse.html")){
              window.location = "./mouse.html" + window.location.search;
            }
          }
        } catch { }
      }