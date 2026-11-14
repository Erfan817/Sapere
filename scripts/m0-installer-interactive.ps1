# Launches the NSIS installer interactively, captures the wizard window,
# then cancels it and verifies nothing was installed.
param(
  [string]$Installer = "D:\Sapere\release\1.5.0\Sapere-Windows-1.5.0-x64-Setup.exe",
  [string]$ShotDir = "D:\Sapere\.sapere\m0-installer-interactive"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $ShotDir | Out-Null

$defaultInstallDir = Join-Path $env:LOCALAPPDATA "Programs\Sapere"
$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Sapere.lnk"
$startShortcut = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Sapere.lnk"

function Get-UninstallEntry {
  Get-ChildItem "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue |
    ForEach-Object { Get-ItemProperty $_.PSPath } |
    Where-Object { $_.DisplayName -like "Sapere*" }
}

if (Test-Path $defaultInstallDir) { throw "Default install directory already exists: $defaultInstallDir" }
if (Test-Path $desktopShortcut) { throw "Desktop shortcut already exists" }
if (Get-UninstallEntry) { throw "Sapere is already installed" }

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$proc = Start-Process -FilePath $Installer -PassThru
$deadline = (Get-Date).AddSeconds(60)
$windowReady = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 700
  $proc.Refresh()
  if ($proc.HasExited) { break }
  if ($proc.MainWindowHandle -ne [IntPtr]::Zero -and $proc.MainWindowTitle) {
    $windowReady = $true
    break
  }
}

if (-not $windowReady) {
  if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  throw "Installer window did not appear within 60 seconds"
}

Start-Sleep -Seconds 3
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save((Join-Path $ShotDir "01-installer-wizard.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

$title = $proc.MainWindowTitle
$handle = $proc.MainWindowHandle

# Cancel: close the wizard window and wait for the process to exit.
$null = $proc.CloseMainWindow()
if (-not $proc.WaitForExit(20000)) {
  Stop-Process -Id $proc.Id -Force
  $cancelled = $false
} else {
  $cancelled = $true
}

Start-Sleep -Seconds 2
$result = [pscustomobject]@{
  installerTitle = $title
  windowHandle = $handle.ToInt64()
  cancelClosedWizard = $cancelled
  exitCode = if ($proc.HasExited) { $proc.ExitCode } else { $null }
  defaultInstallDirExists = Test-Path $defaultInstallDir
  desktopShortcutExists = Test-Path $desktopShortcut
  startMenuShortcutExists = Test-Path $startShortcut
  uninstallEntry = @(Get-UninstallEntry).Count
  screenshot = (Join-Path $ShotDir "01-installer-wizard.png")
}
$result | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $ShotDir "result.json")
$result | ConvertTo-Json -Depth 4
