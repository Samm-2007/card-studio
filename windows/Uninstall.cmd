@echo off
powershell.exe -NoProfile -Command "$p = Join-Path ([Environment]::GetFolderPath('Startup')) 'Card Studio.lnk'; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p }; Write-Host 'Automatic startup removed. Close the connector window to stop the current session.'"
pause
