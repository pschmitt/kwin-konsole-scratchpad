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

// How long to look for scratchpads
const maxRuntime = 10000; // 10s
// Debug logging
const debug = false;
// Verbose logging. Requires debug=true
const verbose = false;

// Logic
var startTime;

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

function processClient(client) {
  if (client == undefined || client.caption == undefined) {
    log("😕 Unprocessable/invalid client. SKIP");
    return false;
  }

  log("🔍 Processing client: " + client.caption);
  if (verbose == true) {
    log(objectToString(client));
  }

  if (client.resourceName == resourceName &&
    client.caption.indexOf(caption) > -1) {
    log("✅ Found scratchpad: " + client.caption);
    return true;
  }

  return false;
}

const scratchpadWatcher = function (client) {
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
  log("🌜 Disconnecting from signals");

  workspace.clientAdded.disconnect(scratchpadWatcher);
  workspace.clientActivated.disconnect(scratchpadWatcher);
}

function connectSignals() {
  log("🔆 Connecting to signals");

  startTime = new Date();
  workspace.clientAdded.connect(scratchpadWatcher);
  workspace.clientActivated.connect(scratchpadWatcher);
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

// Debug - Uncomment when in interactive KWin Console
// toggleScratchpad();

registerShortcut(
  "Konsole Scratchpad",
  "Toggle Konsole Scratchpad",
  "F1",
  function () {toggleScratchpad();});

/* vim: set ft=javascript et ts=2 sw=2 :*/
