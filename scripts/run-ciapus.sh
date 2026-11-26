#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
npm run build
exec go run -buildvcs=false ./cmd/server "$@"
