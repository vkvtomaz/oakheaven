# Convenience wrapper; Python entry works without changing PowerShell execution policy.
$ErrorActionPreference = 'Stop'
python (Join-Path $PSScriptRoot 'prepare_kaelen_atlas.py')
if ($LASTEXITCODE -ne 0) { throw 'Atlas preparation failed' }
