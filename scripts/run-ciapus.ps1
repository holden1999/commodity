$ErrorActionPreference = 'Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    npm run build
    go run -buildvcs=false ./cmd/server @args
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
