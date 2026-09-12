[CmdletBinding()]
param(
  [string]$AccountName,
  [string]$From,
  [string]$To
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$previousApiKey = [Environment]::GetEnvironmentVariable('LASTFM_API_KEY', 'Process')
$secureApiKey = $null
$apiKeyPointer = [IntPtr]::Zero
$plainApiKey = $null

if ([string]::IsNullOrWhiteSpace($AccountName)) {
  $AccountName = Read-Host 'Last.fm account name'
}
if ([string]::IsNullOrWhiteSpace($AccountName)) {
  throw 'A Last.fm account name is required.'
}

Write-Host ''
Write-Host 'Paste your Last.fm API key below.' -ForegroundColor Cyan
Write-Host 'It stays hidden, exists only for this process, and is cleared afterward.' -ForegroundColor DarkGray
$secureApiKey = Read-Host 'API key' -AsSecureString

try {
  $apiKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
  $plainApiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($apiKeyPointer)
  if ([string]::IsNullOrWhiteSpace($plainApiKey)) {
    throw 'The API key cannot be empty.'
  }

  [Environment]::SetEnvironmentVariable('LASTFM_API_KEY', $plainApiKey, 'Process')
  $nodeArguments = @('scripts/export_lastfm_history.mjs', '--user', $AccountName)
  if (-not [string]::IsNullOrWhiteSpace($From)) {
    $nodeArguments += @('--from', $From)
  }
  if (-not [string]::IsNullOrWhiteSpace($To)) {
    $nodeArguments += @('--to', $To)
  }

  Push-Location $repositoryRoot
  try {
    & node @nodeArguments
    if ($LASTEXITCODE -ne 0) {
      throw "The Last.fm exporter exited with code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }
}
finally {
  if ($null -eq $previousApiKey) {
    [Environment]::SetEnvironmentVariable('LASTFM_API_KEY', $null, 'Process')
  }
  else {
    [Environment]::SetEnvironmentVariable('LASTFM_API_KEY', $previousApiKey, 'Process')
  }
  if ($apiKeyPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($apiKeyPointer)
  }
  $plainApiKey = $null
  $secureApiKey = $null
}
