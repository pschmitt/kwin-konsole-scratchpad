// User preferences
const resourceName = "konsole";
const caption = "tmux:scratchpad";

// Size and placement
// where to place the scatchpad on the screen
// Allowed values: "top", "bottom", "center"
const position = "bottom";
const offset = 15; // Offset in pixels
const scratchpadRelativeWidth = 1.0; // 100% of the usable screen area
const scratchpadRelativeHeight = 0.5; // 50% of the usable screen area

// Skip pager/switcher/taskbar
const keepAbove = true;
const hideFromTaskbar = true;
const hideFromSwitcher = true;
const hideFromPager = true;
const showOnAllDesktops = false;

// How long to look for scratchpads
const maxRuntime = 10000; // 10s
// Debug logging
const debug = false;
// Verbose logging. Requires debug=true
const verbose = false;

// Logic
var startTime;
var watchedClients = [];
var watchers = [];
var signalSetup = false;

// Debug functions {{{
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
// }}}

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
  switch (position) {
    case "bottom":
      // center client horizontally
      client_geom.x = maxBounds.x +
        Math.round((maxBounds.width - client_geom.width) / 2);
      client_geom.y = maxBounds.height - client_geom.height +
        maxBounds.y + offset;
      break;
    case "top":
      // center client horizontally
      client_geom.x = maxBounds.x +
        Math.round((maxBounds.width - client_geom.width) / 2);
      client_geom.y = maxBounds.y + offset;
      break;
    case "center":
      // center client horizontally
      client_geom.x = maxBounds.x +
        Math.round((maxBounds.width - client_geom.width) / 2);
      // center client vertically
      client_geom.y = maxBounds.y +
        Math.round((maxBounds.height - client_geom.height) / 2);
      break;
  }
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

function isValidClient(client) {
  if (client == undefined || client.caption == undefined) {
    log("😕 Unprocessable/invalid client. SKIP");
    log(objectToString(client));
    return false;
  }
  return true;
}

function processClient(client) {
  if (!isValidClient(client)) {
    return false;
  }

  log("🔍 Processing client: " + client.caption);
  if (verbose == true) {
    log(objectToString(client));
  }

  if (client.resourceName == resourceName) {
    if (client.caption.indexOf(caption) > -1) {
      log("✅ Found scratchpad: " + client.caption);
      return true;
    } else {
      monitorClientCaptionChanges(client);
    }
  }

  return false;
}

const newWindowWatcher = function (client) {
  if (workspace == undefined) {
    log("💩 Workspace is undefined. We probably got cancelled.");
    disconnectSignals();
  }

  const runtime = new Date() - startTime;
  if (runtime > maxRuntime) {
    log("⌛ Timed out. It's been fun. Now let's seppuku real quick.");
    if (verbose == true) {
      log("🕜 Runtime: " + runtime + "ms");
    }
    disconnectSignals();
    return false;
  }

  if (processClient(client)) {
    setWindowProps(client);
    disconnectSignals();
    return true;
  }

  return false;
}

function disconnectSignals() {
  log("🌜 Disconnecting from all signals");

  workspace.clientAdded.disconnect(newWindowWatcher);
  workspace.clientActivated.disconnect(newWindowWatcher);

  for (var i = 0; i < watchedClients.length; i++) {
    log('🌚 Disconnecting from "' + watchedClients[i].caption + '"');
    watchedClients[i].captionChanged.disconnect(watchers[i]);
  }

  // Clear arrays
  watchedClients.length = 0;
  watchers.length = 0;
}

function isAlreadyMonitored(client) {
  for (var i = 0; i < watchedClients.length; i++) {
    if (watchedClients[i].internalId == client.internalId) {
      return true;
    }
  }
  return false;
}

function monitorClientCaptionChanges(client) {
  if (isAlreadyMonitored(client)) {
    log("🥂 We are already watching this client for caption changes");
    return false;
  }

  log("📷 Caption does not match. " +
    "But we'll be watching for caption changes");
  watchedClients.push(client);
  var watcher = function () {newWindowWatcher(client);}
  var num = watchers.push(watcher);
  client.captionChanged.connect(watcher);
  log("🛂 We're currently watching " + num + " clients")
  return true;
}

function connectSignals() {
  log("🔆 Connecting to signals");

  startTime = new Date();

  // Monitor existing clients
  const clients = workspace.clientList();
  for (var i = 0; i < clients.length; i++) {
    const cl = clients[i];

    log("Checking Existing client: " + cl);

    if (isValidClient(cl)) {
      if (processClient(cl)) {
        setWindowProps(cl);
        disconnectSignals();
        return true;
      } else if (cl.resourceName == resourceName) {
        monitorClientCaptionChanges(cl);
      }
    }
  }

  // Monitor new clients
  workspace.clientAdded.connect(newWindowWatcher);
  workspace.clientActivated.connect(newWindowWatcher);
}

function toggleScratchpad() {
  callDBus(
    "org.kde.kglobalaccel",
    "/component/konsole",
    "org.kde.kglobalaccel.Component",
    "invokeShortcut",
    "Konsole Background Mode",
    function () {connectSignals();}
  );
}


// Main wrapper for toggleScratchpad, call this instead of main() when running
// inside of the KWin debug console
function mainInteractive() {
  toggleScratchpad();
}

// main function - to be called when installing this as a standalone KWin script
function main() {
  registerShortcut(
    "Konsole Scratchpad",
    "Toggle Konsole Scratchpad",
    "F1",
    function () {toggleScratchpad();});
}

// DEBUG
// mainInteractive();
main();

/* vim: set ft=javascript et ts=2 sw=2 :*/
