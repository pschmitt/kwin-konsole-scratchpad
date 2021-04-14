"use strict";

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
const maxRuntime = 5000; // 5s
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
  if (debug === false) {
    return
  }

  print('[' + new Date().toISOString() + "] " + message);
}

function objectToString(object, sep) {
  var output = '';
  for (var property in object) {
    output += property + ': ' + object[property] +
      (typeof sep === 'undefined' ? '\n' : sep);
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
  if (typeof client === 'undefined' || typeof client.caption === 'undefined') {
    log("😕 Unprocessable/invalid client. SKIP");
    log(objectToString(client));
    return false;
  }
  return true;
}

function processClient(client) {
  if (isValidClient(client) === false) {
    return false;
  }

  log("🔍 Processing client: " + client.caption);
  if (verbose === true) {
    log(objectToString(client));
  }

  if (client.resourceName === resourceName) {
    if (client.caption.indexOf(caption) > -1) {
      log("✅ Found scratchpad: " + client.caption);
      return true;
    } else {
      monitorClientCaptionChanges(client);
    }
  }

  return false;
}

const newWindowWatcher = function (event, client) {
  log("❗ Event " + event + " triggered.")

  if (typeof workspace === 'undefined') {
    log("💩 Workspace is undefined. We probably got cancelled.");
    disconnectSignals();
  }

  const runtime = new Date() - startTime;
  if (runtime > maxRuntime) {
    log("⌛ Timed out. It's been fun. Now let's seppuku real quick.");
    if (verbose === true) {
      log("🕜 Runtime: " + runtime + "ms");
    }
    disconnectSignals();
    return false;
  }

  try {
    if (processClient(client)) {
      setWindowProps(client);
      disconnectSignals();
      return true;
    }
  } catch (err) {
    log("🤕 Exception caught while processing event " + event + ": " + err);
  }

  return false;
}

var newWindowWatcherClientActivated = function (client) {
  return newWindowWatcher("clientActivated", client);
}

var newWindowWatcherClientAdded = function (client) {
  return newWindowWatcher("clientAdded", client);
}

function disconnectSignals() {
  log("🌜 Disconnecting from all signals");

  if (signalSetup === true) {
    try {
      workspace.clientAdded.disconnect(newWindowWatcherClientAdded);
      workspace.clientActivated.disconnect(newWindowWatcherClientActivated);
    } catch (err) {
      log("🤕 Exception raised during disconnect: " + err);
    }
  }

  for (var i = 0; i < watchedClients.length; i++) {
    log('🌚 Disconnecting from "' + watchedClients[i].caption + '"');
    try {
      watchedClients[i].captionChanged.disconnect(watchers[i]);
    } catch (err) {
      log("🤕 Exception raised during (client.cation) disconnect: " + err);
    }
  }

  // Clear arrays
  watchedClients.length = 0;
  watchers.length = 0;
  signalSetup = false;
}

function isAlreadyMonitored(client) {
  for (var i = 0; i < watchedClients.length; i++) {
    if (watchedClients[i].internalId === client.internalId) {
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

  var watcher = function () {newWindowWatcher("captionChanged", client);}
  var num = watchers.push(watcher);
  client.captionChanged.connect(watcher);
  watchedClients.push(client);

  log("🛂 We're currently watching " + num + " clients")

  return true;
}

function searchScratchpad(monitor) {
  const clients = workspace.clientList();

  for (var i = 0; i < clients.length; i++) {
    const cl = clients[i];

    log("👀 Checking client: " + cl);

    if (isValidClient(cl)) {
      if (processClient(cl)) {
        setWindowProps(cl);
        disconnectSignals();
        return true;
      } else if ((monitor === true) && (cl.resourceName === resourceName)) {
        log("🤨 Monitor client for caption changes: " + cl.caption);
        monitorClientCaptionChanges(cl);
      }
    }
  }

  return false;
}

function connectSignals() {
  log("🔆 Connecting to signals");

  startTime = new Date();

  // Monitor existing clients
  try {
    searchScratchpad(true);
  } catch (err) {
    log("🤕 Exception during initial scratchpad search: " + err);
  }

  // Monitor new clients
  workspace.clientAdded.connect(newWindowWatcherClientAdded);
  workspace.clientActivated.connect(newWindowWatcherClientActivated);
  signalSetup = true;
}

function toggleScratchpad() {
  // Apply rules to any currently displayed scratchpad
  searchScratchpad(false);

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
