const resourceName = "konsole";
const windowTitle = "tmux:scratchpad";
const debug = true;

var watchedKonsoleWindows = [];

function log(message) {
  if (debug == false) {
    return
  }

  print('[' + new Date().toISOString() + "] " + message);
}

function objectToString(object) {
  var output = '';
  for (var property in object) {
    output += property + ': ' + object[property] + '\n';
  }
  return output
}


function setScratchpadProps(client) {
  const maxBounds = workspace.clientArea(
    // KWin.MaximizeArea,
    KWin.PlacementArea,
    workspace.activeScreen,
    workspace.currentDesktop
  );

  // Set scratchpad geometry
  const offset = 15; // KWin.readConfig("offset", 25)
  const client_geom = client.geometry;
  client_geom.width = maxBounds.width; // 100% width
  client_geom.height = Math.round(maxBounds.height * 0.50); // 50% of usable screen
  client_geom.x = maxBounds.x;
  client_geom.y = maxBounds.height - client_geom.height + maxBounds.y + offset;
  client.geometry = client_geom;

  // Set core window props
  client.desktop = workspace.currentDesktop;
  client.minimized = false;
  client.keepAbove = true;
  client.onAllDesktops = false;
  client.activeClient = client;

  // Hide from taskbar etc.
  client.skipSwitcher = true;
  client.skipPager = true;
  client.skipTaskbar = true;
}

function onClientCaptionChanged(client) {
  log("Client caption changed! -> " + client.caption)
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
  // log("Dump: " + objectToString(client));

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
      if (watchedKonsoleWindows.indexOf(client.internalId) > -1) {
        log("We are already watching this konsole window for caption changes [2/2]");
        log("internalId=" + client.internalId);
      } else {
        log("Caption does not match. But we'll be watching for caption changes [2/2]");
        watchedKonsoleWindows.push(client.internalId);
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
workspace.clientActivated.connect(function (client) {
  processClient("clientActivated", client);
});


workspace.clientAdded.connect(function (client) {
  processClient("clientAdded", client);
});

// function shortcutHook() {
//   /*const clients = workspace.clientList();
//
//   for (var i = 0; i < clients.length; i++) {
//     var client = clients[i];
//
//     processClient("shortcut", client);
//   }*/
//
//   log("Shortcut key pressed. Toggling konsole");
//   callDBus("org.kde.kglobalaccel", "/component/konsole", "invokeShortcut", "Konsole Background Mode");
// }
//
// // log("Registering shortcut")
// registerShortcut("Konsole-Scratchpad", "Konsole Scratchpad Terminal", "F12", shortcutHook);

// Debug
// shortcutHook();
