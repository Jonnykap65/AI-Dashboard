param(
    [string]$OutputName = "AIHomeDashboard",
    [string]$InstallerName = "AIHomeDashboardInstaller"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendPython = Join-Path $Root "backend\.venv\Scripts\python.exe"
$FrontendDir = Join-Path $Root "frontend"
$DesktopProject = Join-Path $Root "desktop\AIHomeDashboard.Desktop\AIHomeDashboard.Desktop.csproj"
$InstallerProject = Join-Path $Root "desktop\AIHomeDashboard.Installer\AIHomeDashboard.Installer.csproj"
$DesktopPublishDir = Join-Path $Root ("build\desktop-publish\" + [Guid]::NewGuid().ToString("N"))
$StageDir = Join-Path $Root ("build\installer-staging\" + [Guid]::NewGuid().ToString("N"))
$InstallerPublishDir = Join-Path $Root "dist\installer"
$InstallerPayloadDir = Join-Path $Root "desktop\AIHomeDashboard.Installer\Payload"
$PayloadZip = Join-Path $InstallerPayloadDir "AIHomeDashboardPayload.zip"
$InstallerExe = Join-Path $Root "dist\$InstallerName.exe"

function Copy-MissingChildren {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDir,
        [Parameter(Mandatory = $true)][string]$DestinationDir
    )

    if (-not (Test-Path $SourceDir)) {
        return
    }

    New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
    Get-ChildItem -LiteralPath $SourceDir -Force | ForEach-Object {
        $destination = Join-Path $DestinationDir $_.Name
        if (-not (Test-Path $destination)) {
            Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
        }
    }
}

function Copy-SafeConfigChildren {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDir,
        [Parameter(Mandatory = $true)][string]$DestinationDir
    )

    if (-not (Test-Path $SourceDir)) {
        return
    }

    New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
    Get-ChildItem -LiteralPath $SourceDir -Force | Where-Object {
        $_.Name -eq ".gitkeep" -or $_.Name -like "*.example.json"
    } | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $DestinationDir $_.Name) -Recurse -Force
    }
}

function Test-ForbiddenPackagePath {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath
    )

    $normalized = $RelativePath.Replace("/", "\").TrimStart("\")
    $segments = $normalized -split "\\"

    return $segments -contains ".claude"
}

function Assert-NoForbiddenStageEntries {
    param(
        [Parameter(Mandatory = $true)][string]$Directory
    )

    if (-not (Test-Path $Directory)) {
        return
    }

    $rootPath = (Resolve-Path -LiteralPath $Directory).Path.TrimEnd("\") + "\"
    $forbidden = Get-ChildItem -LiteralPath $Directory -Force -Recurse | Where-Object {
        $relativePath = $_.FullName.Substring($rootPath.Length)
        Test-ForbiddenPackagePath -RelativePath $relativePath
    } | Select-Object -First 10 -ExpandProperty FullName

    if ($forbidden) {
        throw "Installer staging contains forbidden package path(s): $($forbidden -join '; ')"
    }
}

function Assert-NoForbiddenZipEntries {
    param(
        [Parameter(Mandatory = $true)][string]$ZipPath
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $forbidden = $archive.Entries | Where-Object {
            Test-ForbiddenPackagePath -RelativePath $_.FullName
        } | Select-Object -First 10 -ExpandProperty FullName

        if ($forbidden) {
            throw "Installer payload contains forbidden package path(s): $($forbidden -join '; ')"
        }
    }
    finally {
        $archive.Dispose()
    }
}

if (-not (Test-Path $BackendPython)) {
    throw "Backend virtual environment not found at $BackendPython"
}

if (-not (Test-Path $InstallerProject)) {
    throw "Installer project not found at $InstallerProject"
}

Write-Host "Building AI Home Dashboard installer..."

New-Item -ItemType Directory -Force -Path $StageDir | Out-Null
New-Item -ItemType Directory -Force -Path $InstallerPayloadDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root "dist") | Out-Null

Push-Location $FrontendDir
try {
    & npm.cmd run build
}
finally {
    Pop-Location
}

& $BackendPython -m PyInstaller `
    --noconfirm `
    --clean `
    --name "AIHomeDashboardServer" `
    --onefile `
    --distpath (Join-Path $StageDir "backend") `
    --workpath (Join-Path $Root "build\pyinstaller") `
    --specpath (Join-Path $Root "build") `
    --add-data "$Root\frontend\dist;frontend\dist" `
    --hidden-import "uvicorn.logging" `
    --hidden-import "uvicorn.loops" `
    --hidden-import "uvicorn.loops.auto" `
    --hidden-import "uvicorn.protocols" `
    --hidden-import "uvicorn.protocols.http" `
    --hidden-import "uvicorn.protocols.http.auto" `
    --hidden-import "uvicorn.protocols.websockets" `
    --hidden-import "uvicorn.protocols.websockets.auto" `
    --hidden-import "uvicorn.lifespan" `
    --hidden-import "uvicorn.lifespan.on" `
    --hidden-import "multipart" `
    --hidden-import "openpyxl" `
    (Join-Path $Root "scripts\desktop_entry.py")

if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller failed with exit code $LASTEXITCODE"
}

New-Item -ItemType Directory -Force -Path (Join-Path $StageDir "backend\data") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $StageDir "backend\config") | Out-Null

Copy-SafeConfigChildren -SourceDir (Join-Path $Root "backend\config") -DestinationDir (Join-Path $StageDir "backend\config")

dotnet publish $DesktopProject `
    -c Release `
    -r win-x64 `
    --self-contained false `
    -p:PublishSingleFile=false `
    -p:PublishReadyToRun=false `
    -p:PublishDir="$DesktopPublishDir\"

if ($LASTEXITCODE -ne 0) {
    throw "Desktop wrapper publish failed with exit code $LASTEXITCODE"
}

Copy-Item -Path (Join-Path $DesktopPublishDir "*") -Destination $StageDir -Recurse -Force

Assert-NoForbiddenStageEntries -Directory $StageDir

if (Test-Path $PayloadZip) {
    Remove-Item -LiteralPath $PayloadZip -Force
}

Compress-Archive -Path (Join-Path $StageDir "*") -DestinationPath $PayloadZip -CompressionLevel Optimal

Assert-NoForbiddenZipEntries -ZipPath $PayloadZip

if (Test-Path $InstallerPublishDir) {
    Remove-Item -LiteralPath $InstallerPublishDir -Recurse -Force
}

dotnet publish $InstallerProject `
    -c Release `
    -r win-x64 `
    --self-contained false `
    -p:PublishSingleFile=true `
    -p:PublishReadyToRun=false `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:PublishDir="$InstallerPublishDir\"

if ($LASTEXITCODE -ne 0) {
    throw "Installer publish failed with exit code $LASTEXITCODE"
}

$publishedInstaller = Join-Path $InstallerPublishDir "AIHomeDashboardInstaller.exe"
if (-not (Test-Path $publishedInstaller)) {
    throw "Published installer was not found at $publishedInstaller"
}

Copy-Item -LiteralPath $publishedInstaller -Destination $InstallerExe -Force

Write-Host ""
Write-Host "Built installer executable at:"
Write-Host "  $InstallerExe"
Write-Host ""
Write-Host "Run that installer to choose current-user or all-users installation and the install folder."
