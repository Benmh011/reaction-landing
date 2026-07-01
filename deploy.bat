@echo off
REM ============================================================
REM  Reaction one-click deploy
REM  1. Finds the newest reaction-*.zip anywhere under C:\Users\Rhys
REM     (so it doesn't matter where the browser saved it)
REM  2. Extracts it straight over the repo
REM  3. Stages exactly the files the zip contained
REM  4. Commits (timestamped) and pushes to origin/main
REM  Double-click to run. Safe to re-run.
REM ============================================================
setlocal
set REPO=C:\Users\Rhys\Reaction

echo.
echo [1/4] Locating newest reaction-*.zip ...
powershell -NoProfile -Command "$z=Get-ChildItem 'C:\Users\Rhys' -Recurse -Filter 'reaction-*.zip' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if(-not $z){exit 1}; Write-Host ('      Using: '+$z.FullName); Expand-Archive -Path $z.FullName -DestinationPath '%REPO%' -Force; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[IO.Compression.ZipFile]::OpenRead($z.FullName); $zip.Entries | Where-Object { $_.FullName -notmatch '/$' } | ForEach-Object { $_.FullName } | Set-Content -Encoding ascii '%TEMP%\rx_files.txt'; $zip.Dispose()"
if errorlevel 1 (
  echo   ERROR: no reaction-*.zip found under C:\Users\Rhys. Download the zip first.
  pause
  exit /b 1
)

echo [2/4] Extracted into repo. Syncing with origin ...
cd /d %REPO%
git pull --rebase origin main

echo [3/4] Staging deployed files ...
for /f "usebackq delims=" %%f in ("%TEMP%\rx_files.txt") do git add "%%f"

echo [4/4] Committing and pushing ...
git commit -m "Deploy drop (%date% %time%)"
git push origin main

echo.
echo ===== DEPLOY COMPLETE - check Vercel in ~90s =====
pause
