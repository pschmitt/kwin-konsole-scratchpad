#!/usr/bin/env bash

cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

# https://unix.stackexchange.com/a/517690/101415
script="${PWD}/contents/code/main.js"

num=$(dbus-send --print-reply --dest=org.kde.KWin \
    /Scripting org.kde.kwin.Scripting.loadScript \
    string:"$script" | awk 'END {print $2}' )

dbus-send --print-reply --dest=org.kde.KWin "/${num}" \
    org.kde.kwin.Scripting.run
