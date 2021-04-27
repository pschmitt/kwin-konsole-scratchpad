"use strict";

// User preferences
const resourceName = "konsole";
const caption = "tmux:scratchpad";

// Size and placement
// where to place the scatchpad on the screen
// Allowed values: "top", "bottom", "center"
const position = "bottom";
const offset = 0; // Offset in pixels
const width = 1.0; // 100% of the usable screen area
const height = 0.5; // 50% of the usable screen area

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

function logError(message, error) {
  log("🚨 Exception caught " + message + ": " + error);
}

function logObject(object) {
  if ((debug === false) || (verbose === false)) {
    return
  }

  log("🐛 VERBOSE OBJECT LOG:\n" + objectToString(object));
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

// https://stackoverflow.com/a/3885844/1872036
function isFloat(n) {
  return n === +n && n !== (n | 0);
}

function setWindowProps(client) {
  log("💄 Setting window properties for " + client.caption);

  const maxBounds = workspace.clientArea(
    // NOTE We use KWin.PlacementArea instead of KWin.MaximizeArea here to
    // avoid having to deal with panel sizes
    KWin.PlacementArea,
    workspace.activeScreen,
    workspace.currentDesktop
  );

  // Set scratchpad geometry
  const client_geom = client.geometry;

  // Set target window dimensions
  // NOTE: All (float!) dimensions that are less than 10 are considered to be
  // a % of the screen size, since isFloat(1.0) returns true ;)
  // Super tiny scratchpad terminals don't make sense to me
  if ((isFloat(width)) || (width < 10)) {
    log("📐 Set window width to " + Math.round(width * 100.0) + "%");
    client_geom.width = Math.round(maxBounds.width * width);
  } else {
    log("📏 Set window width to " + width + " pixels");
    client_geom.width = width;
  }

  if ((isFloat(height)) || (height < 10)) {
    log("📐 Set window height to " + Math.round(height * 100.0) + "%");
    client_geom.height = Math.round(maxBounds.height * height);
  } else {
    log("📏 Set window height to " + height + " pixels");
    client_geom.height = height;
  }

  // Set window position
  switch (position) {
    case "bottom":
      log("🔻 Position the window at the bottom of the screen");
      // center client horizontally
      client_geom.x = maxBounds.x +
        Math.round((maxBounds.width - client_geom.width) / 2);
      client_geom.y = maxBounds.height - client_geom.height +
        maxBounds.y + offset;
      break;
    case "top":
      log("🔺 Position the window at the top of the screen");
      // center client horizontally
      client_geom.x = maxBounds.x +
        Math.round((maxBounds.width - client_geom.width) / 2);
      client_geom.y = maxBounds.y + offset;
      break;
    case "center":
      log("🎯 Position the window at the center of the screen");
      // center client horizontally
      client_geom.x = maxBounds.x +
        Math.round((maxBounds.width - client_geom.width) / 2);
      // center client vertically
      client_geom.y = maxBounds.y +
        Math.round((maxBounds.height - client_geom.height) / 2);
      break;
    default:
      log("🔴 Invalid window position");
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
    logObject(client);
    return false;
  }
  return true;
}

function processClient(client) {
  if (isValidClient(client) === false) {
    return false;
  }

  log("🔍 Processing client: " + client.caption);
  logObject(client);

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

const newWindowWatcher = function (event, client) {
  log("❗ Event " + event + " triggered.")

  if (typeof workspace === 'undefined') {
    log("💩 Workspace is undefined. We probably got cancelled.");
    disconnectSignals();
  }

  // Check script runtime
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
    logError("while processing event " + event, err);
  }

  return false;
}

var newWindowWatcherClientActivated = function (client) {
  return newWindowWatcher("clientActivated", client);
}

var newWindowWatcherClientAdded = function (client) {
  return newWindowWatcher("clientAdded", client);
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

  log('📷 Monitoring client "' + client.caption + '" for caption changes');

  var watcher = function () {newWindowWatcher("captionChanged", client);}
  client.captionChanged.connect(watcher);

  var num = watchers.push(watcher);
  watchedClients.push(client);

  log("🛂 We're currently watching " + num + " clients")

  return true;
}

function searchScratchpad(monitor, applyProps) {
  // Default values
  monitor = (typeof monitor !== 'undefined') ? monitor : true;
  applyProps = (typeof applyProps !== 'undefined') ? applyProps : true;

  log("🔰 Starting search for scratchpad window");

  const clients = workspace.clientList();

  for (var i = 0; i < clients.length; i++) {
    const cl = clients[i];

    // Do not log cl.caption here since it may be undefined
    log("👀 Checking client: " + cl);

    if (processClient(cl)) {
      if (applyProps === true) {
        setWindowProps(cl);
      }
      disconnectSignals();
      return true;
    } else if ((monitor === true) && (cl.resourceName === resourceName)) {
      monitorClientCaptionChanges(cl);
    }
  }

  return false;
}

function disconnectSignals() {
  log("🌜 Disconnecting from all signals");

  if (signalSetup === true) {
    try {
      log('🌚 Disconnecting signal clientAdded');
      workspace.clientAdded.disconnect(newWindowWatcherClientAdded);
      log('🌚 Disconnecting signal clientActivated');
      workspace.clientActivated.disconnect(newWindowWatcherClientActivated);
    } catch (err) {
      logError("during disconnect", err);
    }
  }

  for (var i = 0; i < watchedClients.length; i++) {
    log('🌚 Disconnecting signal captionChanged for "' +
      watchedClients[i].caption + '"');
    try {
      watchedClients[i].captionChanged.disconnect(watchers[i]);
    } catch (err) {
      logError("during (client.caption) disconnect", err);
    }
  }

  // Clear arrays
  watchedClients.length = 0;
  watchers.length = 0;
  signalSetup = false;
}

function connectSignals() {
  // Remember start time
  startTime = new Date();

  var found = false;

  // Monitor existing clients for caption changes
  try {
    found = searchScratchpad(true, true);
  } catch (err) {
    logError("during initial scratchpad search", err);
  }

  log("🔆 Connecting to signals");

  if (found === true) {
    log("⏩ We already found the scratchpad window. " +
      "Skip monitoring of new clients");
  } else {
    // Monitor new clients
    log("🌞 Monitor clientAdded signal");
    workspace.clientAdded.connect(newWindowWatcherClientAdded);
    log("🌞 Monitor clientActivated signal");
    workspace.clientActivated.connect(newWindowWatcherClientActivated);
    signalSetup = true;
  }
}

function toggleScratchpad() {
  // Default callback function
  var callback = connectSignals;
  // Apply rules to any currently displayed scratchpad
  var found = searchScratchpad(false, true);

  if (found === true) {
    callback = function () {
      log("⏩ Scratchpad currently displayed. " +
        "It should get hidden in this iteration. " +
        "Skipping signal setup.");
    };
  } else {
    log("🥋 Scratchpad window currrently not displayed. " +
      "It should appear soon™");
  }

  log("🔳 Toggling Konsole's Background Mode");

  callDBus(
    "org.kde.kglobalaccel",
    "/component/konsole",
    "org.kde.kglobalaccel.Component",
    "invokeShortcut",
    "Konsole Background Mode",
    callback
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
