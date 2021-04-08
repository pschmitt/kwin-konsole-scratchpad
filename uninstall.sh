#!/usr/bin/env bash

cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

kpackagetool5 -r .

rm -vf ~/.local/share/kservices5/konsole-scratchpad.desktop
