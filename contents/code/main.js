// User preferences
const resourceName = "konsole";
const windowTitle = "tmux:scratchpad";

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

// Additional events to watch for
// FIXME Setting the following to true has the potential to really slow down
// KWin. Having it set to false has the negative side effect of not setting the
// window properties of the target if it is started *before* this script gets
// executed though.
const watchFocussedClients = false;

// Debug logging
const debug = false;
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

function setScratchpadProps(client) {
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

function processClient(event, client) {
  log("Event: " + event);

  if (client == undefined) {
    log("Undefined client");
    return false;
  }

  if (client.caption == undefined) {
    log("Undefined caption");
    return false;
  }

  log(
    'client.resourceName="' + client.resourceName +
    '" - client.caption="' + client.caption + '"'
  );

  if (verbose == true) {
    log("Dump: " + objectToString(client));
  }

  if (client.resourceName == resourceName) {
    log("Client resource name matches :) [1/2]");
    var rc = false;

    // FIXME Why can't we use contains or includes here?
    if (client.caption.indexOf(windowTitle) > -1) {
      log("Client window title (caption) matches! [2/2]");
      setScratchpadProps(client);
      rc = true;

    } else {
      rc = false;

      // FIXME client.windowID is always 0 (on Wayland at least)
      if (watchedWindows.indexOf(client.internalId) > -1) {
        log("We are already watching this konsole window for caption changes [2/2]");
        log("internalId=" + client.internalId);
      } else {
        log("Caption does not match. But we'll be watching for caption changes [2/2]");
        watchedWindows.push(client.internalId);
        client.captionChanged.connect(function () {
          processClient("captionChanged", client);
        });
      }
    }

    return rc;
  }

  log("Client is *NOT* matching criteria");
  return false;
}

// Register event listeners
// FIXME How to unregister?!
workspace.clientAdded.connect(function (client) {
  processClient("clientAdded", client);
});

if (watchFocussedClients == true) {
  workspace.clientActivated.connect(function (client) {
    processClient("clientActivated", client);
  });
}
