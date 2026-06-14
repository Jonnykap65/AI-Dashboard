# Development Environment Commands

Use these from PowerShell when working on the local dashboard.

- **Start command:** use the command under [Start the dev environment](#start-the-dev-environment) to launch both services.
- **Stop command:** use the command under [Stop the dev environment](#stop-the-dev-environment) to stop both services.

## Start the dev environment

This starts the FastAPI backend on `127.0.0.1:8000` and the Vite frontend on `127.0.0.1:5174` as detached hidden processes. Closing the current terminal will not stop them.

The start command first stops any process already listening on those two development ports, then starts both services with fixed ports and checks that they respond.

```powershell
$ErrorActionPreference = "Stop"
Set-Location "path\to\AI-Dashboard"

$root = (Get-Location).Path
$logs = Join-Path $root "logs"
$backendPort = 8000
$frontendPort = 5174
$backendUrl = "http://127.0.0.1:$backendPort/api/system/health"
$settingsUrl = "http://127.0.0.1:$backendPort/api/settings"
$frontendUrl = "http://127.0.0.1:$frontendPort/"

New-Item -ItemType Directory -Force $logs | Out-Null

function Stop-DevPort {
    param([int]$Port)
    $pattern = "^\s*TCP\s+127\.0\.0\.1:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$"
    $processIds = netstat -ano -p tcp |
        Select-String -Pattern $pattern |
        ForEach-Object { [int]$_.Matches[0].Groups[1].Value } |
        Select-Object -Unique

    foreach ($processId in $processIds) {
        if ($processId -and $processId -ne $PID) {
            Write-Host "Stopping existing process $processId on port $Port"
            Stop-Process -Id $processId -Force
        }
    }
}

function Wait-Http {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Seconds = 20
    )
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
            Write-Host "$Name is responding at $Url"
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    } while ((Get-Date) -lt $deadline)

    Write-Warning "$Name did not respond at $Url within $Seconds seconds"
    return $false
}

Stop-DevPort -Port $backendPort
Stop-DevPort -Port $frontendPort

$backendPython = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $backendPython)) {
    throw "Backend virtual environment was not found at $backendPython"
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

$backendOut = Join-Path $logs "backend.out.log"
$backendErr = Join-Path $logs "backend.err.log"
$frontendOut = Join-Path $logs "frontend.out.log"
$frontendErr = Join-Path $logs "frontend.err.log"

$backend = Start-Process -FilePath $backendPython -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -ArgumentList @("-m","uvicorn","backend.app.main:app","--host","127.0.0.1","--port",$backendPort)
$frontend = Start-Process -FilePath $npm -WorkingDirectory (Join-Path $root "frontend") -WindowStyle Hidden -PassThru -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr -ArgumentList @("run","dev","--","--port",$frontendPort,"--strictPort")

Write-Host "Backend PID:  $($backend.Id)"
Write-Host "Frontend PID: $($frontend.Id)"

Start-Sleep -Seconds 2

if ($backend.HasExited) {
    Write-Warning "Backend process exited during startup. Recent backend errors:"
    Get-Content $backendErr -Tail 25 -ErrorAction SilentlyContinue
}

if ($frontend.HasExited) {
    Write-Warning "Frontend process exited during startup. Recent frontend errors:"
    Get-Content $frontendErr -Tail 25 -ErrorAction SilentlyContinue
}

$backendReady = Wait-Http -Name "Backend health" -Url $backendUrl
$frontendReady = Wait-Http -Name "Frontend" -Url $frontendUrl

if ($backendReady) {
    try {
        Invoke-WebRequest -Uri $settingsUrl -UseBasicParsing -TimeoutSec 5 | Out-Null
        Write-Host "Backend data API is responding at $settingsUrl"
    } catch {
        Write-Warning "Backend started, but the data API returned an error at $settingsUrl"
        Write-Warning $_.Exception.Message
        Write-Host "Recent backend errors:"
        Get-Content $backendErr -Tail 25 -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "Dashboard: $frontendUrl"
Write-Host "API docs:  http://127.0.0.1:$backendPort/docs"
Write-Host "Logs:      $logs"
```

Open the dashboard at:

```text
http://127.0.0.1:5174
```

## Stop the dev environment

This stops only the processes listening on the dashboard development ports.

```powershell
$ErrorActionPreference = "Stop"
$ports = 8000, 5174
$processIds = @()

foreach ($port in $ports) {
    $pattern = "^\s*TCP\s+127\.0\.0\.1:$port\s+\S+\s+LISTENING\s+(\d+)\s*$"
    $processIds += netstat -ano -p tcp |
        Select-String -Pattern $pattern |
        ForEach-Object { [int]$_.Matches[0].Groups[1].Value }
}

$processIds = $processIds | Select-Object -Unique

if (-not $processIds) {
    Write-Host "No dashboard development processes are listening on ports $($ports -join ', ')."
} else {
    foreach ($processId in $processIds) {
        Write-Host "Stopping process $processId"
        Stop-Process -Id $processId -Force
    }
}
```

## Logs

If a service does not start, check:

```powershell
Get-Content ".\logs\backend.err.log"
Get-Content ".\logs\frontend.err.log"
```
