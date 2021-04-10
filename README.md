# Konsole Scratchpad

This here is a KWin script that makes Konsole behave more like Guake does.

# Installation

1. Clone this repository
```shell
git clone https://github.com/pschmitt/kwin-konsole-scratchpad.git
cd ./kwin-konsole-scratchpad
```
2. Choose one of the following two install paths:
  - Shortcut only (**recommended**)
  - KWin script

## TL;DR (Shortcut only)

1. Setup a custom shortcut that triggers [`./shortcut.sh`](./shortcut.sh)
3. Set up a scratchpad service (see below)

## Install as a KWin script

1. Edit settings in [`./contents/code/main.js`](./contents/code/main.js)
2. Run [`./install.sh`](./install.sh)
3. Open System Settings: `Window Management > KWin Scripts` and make sure 
that "Konsole Scratchpad" is enabled
4. Setup a custom key binding for "Toggle Konsole Scratchpad"
5. Set up a scratchpad service (see below)

## Setup a scratchpad service

Since this script is mainly intended to have a Konsole window stick to the
bottom of the screen and show/hide on a keypress I suggest you autostart 
konsole via one of the following methods:

### Desktop file

See [./extra/konsole-scratchpad.desktop](./extra/konsole-scratchpad.desktop)

To install:

```shell
cp ./extra/konsole-scratchpad.desktop ~/.config/autostart
```

### systemd user service

See [./extra/konsole-scratchpad.service](./extra/konsole-scratchpad.service)

To install:

```shell
cp ./extra/konsole-scratchpad.service ~/.config/systemd/user
systemctl --user enable --now konsole-scratchpad.service
```

Once done you should be able to show/hide your Konsole scratchpad with the 
"Toggle Konsole Scratchpad" shortcut (<kbd>F1</kbd> by default)

# Uninstall

1. Run [`./uninstall.sh`](./uninstall.sh)
2. Restart KWin 🤷

# Inspiration and credits

- https://github.com/fooblahblah/shimmer
