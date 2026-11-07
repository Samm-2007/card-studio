$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$homeDir = Join-Path $env:LOCALAPPDATA 'CardStudio'
New-Item -ItemType Directory -Force -Path $homeDir | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'CardStudio-Connector.ps1') -Destination (Join-Path $homeDir 'CardStudio-Connector.ps1') -Force
$powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'Card Studio.lnk'))
$shortcut.TargetPath = $powerShell
$shortcut.Arguments = '-NoProfile -STA -WindowStyle Minimized -ExecutionPolicy Bypass -File "' + (Join-Path $homeDir 'CardStudio-Connector.ps1') + '"'
$shortcut.WorkingDirectory = $homeDir
$shortcut.WindowStyle = 7
$shortcut.Save()
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Uninstall.cmd') -Destination $homeDir -Force
[Windows.Forms.MessageBox]::Show('Card Studio will start automatically when you sign in to Windows. No administrator account required. Select the printer once. Save CR80, ribbon and magnetic filter settings in Windows Printing Preferences; these defaults are used on future starts. Print confirmation remains enabled. Close any old connector before continuing. To remove automatic startup, run Uninstall.cmd in LocalAppData\CardStudio.', 'Card Studio setup') | Out-Null
Start-Process -FilePath $powerShell -ArgumentList $shortcut.Arguments
