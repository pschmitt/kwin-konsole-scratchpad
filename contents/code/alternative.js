// User preferences
const resourceName = "konsole";
const caption = "tmux:scratchpad";

// Size and placement
const offset = 15; // Offset in pixels
const scratchpadRelativeWidth = 1.0; // 100% of the usable screen area
const scratchpadRelativeHeight = 0.5; // 50% of the usable screen area

// Skip pager/switcher/taskbar
const keepAbove = true;
const hideFromTaskbar = true;
const hideFromSwitcher = true;
const hideFromPager = true;
const showOnAllDesktops = false;

// Debug logging
const debug = true;
// Verbose logging. Requires debug=true
const verbose = false;

// Logic
var watchedWindows = [];

function log(message) {
  if (debug == false) {
    return
  }

  print('[' + new Date().toISOString() + "] " + message);
}

function objectToString(object, sep) {
  var output = '';
  for (var property in object) {
    output += property + ': ' + object[property] +
      (sep == undefined ? '\n' : sep);
  }
  return output
}

function setWindowProps(client) {
  const maxBounds = workspace.clientArea(
    // NOTE We use KWin.PlacementArea instead of KWin.MaximizeArea here to
    // avoid having to deal with panel sizes
    KWin.PlacementArea,
    workspace.activeScreen,
    workspace.currentDesktop
  );

  // Set scratchpad geometry
  const client_geom = client.geometry;
  client_geom.width = Math.round(maxBounds.width * scratchpadRelativeWidth);
  client_geom.height = Math.round(maxBounds.height * scratchpadRelativeHeight);
  // center client horizontally
  client_geom.x = maxBounds.x +
    Math.round((maxBounds.width - client_geom.width) / 2);
  client_geom.y = maxBounds.height - client_geom.height + maxBounds.y + offset;
  client.geometry = client_geom;

  // Set core window props
  client.desktop = workspace.currentDesktop;
  client.minimized = false;
  client.keepAbove = keepAbove;
  client.onAllDesktops = showOnAllDesktops;
  client.activeClient = client;

  // Hide from taskbar etc.
  client.skipSwitcher = hideFromSwitcher;
  client.skipPager = hideFromPager;
  client.skipTaskbar = hideFromTaskbar;
}

function checkClient(client) {
  if (client == undefined || client.caption == undefined) {
    log("Unprocessable client. SKIP");
    return false;
  }

  if (client.resourceName == resourceName &&
    client.caption.indexOf(caption) > -1) {
    log("✅ Found scratchpad: " + client.caption);
    return true;
  }

  return false;
}

function searchScratchpadWindow() {
  const clients = workspace.clientList();
  var client;

  for (var i = 0; i < clients.length; i++) {
    client = clients[i];

    log("Processing client #" + (i + 1) + "/" + clients.length + ": " +
      client.caption);
    if (verbose == true) {
      log(objectToString(client));
    }

    if (checkClient(client)) {
      setWindowProps(client);
      return true;
    }
  }

  print("❌ No scratchpad window found");
  return false;
}

function toggleScratchpad() {
  // FIXME The callback is probably called too early here.
  // There might be a delay between the DBUS call and the Konsole window
  // appearing.
  callDBus(
    "org.kde.kglobalaccel",
    "/component/konsole",
    "org.kde.kglobalaccel.Component",
    "invokeShortcut",
    "Konsole Background Mode",
    function () {searchScratchpadWindow();}
  );
}

// Debug - Uncomment when in interactive KWin Console
// toggleScratchpad();

/* vim: set ft=javascript et ts=2 sw=2 :*/
