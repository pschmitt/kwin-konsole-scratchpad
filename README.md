# Konsole Scratchpad

This here is a KWin script that makes Konsole behave more like Guake does.

# Installation

1. `git clone https://github.com/pschmitt/kwin-konsole-scratchpad.git`
2. `cd ./kwin-konsole-scratchpad`
3. Edit settings in [`./contents/code/main.js`](./contents/code/main.js)
4. Run [`./install.sh`](./install.sh)
5. Open System Settings: `Window Management > KWin Scripts` and make sure that "Konsole Scratchpad" is enabled

## Optional: Setup a scratchpad

Since this script is mainly intended to have a Konsole window stick to the
bottom of the screen and show/hide on a keypress I suggest you autostart 
konsole using the desktop file in 
[./extra/konsole-scratchpad.desktop](./extra/konsole-scratchpad.desktop):

```shell
cp ./extra/konsole-scratchpad.desktop ~/.config/autostart
```

You should then be able to show/hide your scratchpad with the 
"Toggle Background Window" shortcut 
(<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F12</kbd> by default)

# Uninstall

1. Run [`./uninstall.sh`](./uninstall.sh)
2. Restart KWin

# Inspiration and credits

- https://github.com/fooblahblah/shimmer