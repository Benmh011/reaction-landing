@echo off
REM ============================================================
REM  Reaction one-click deploy  (v2)
REM  1. Finds the newest reaction-*.zip anywhere under C:\Users\Rhys
REM  2. Syncs the repo with origin FIRST (clean tree, so rebase works)
REM  3. Extracts the zip straight over the repo
REM  4. Stages exactly the files the zip contained
REM  5. Commits (timestamped), pushes, and deletes the used zip
REM     so a stale zip can never be picked up by the next deploy.
REM  Double-click to run. Safe to re-run.
REM ============================================================
setlocal
set REPO=C:\Users\Rhys\Reaction

echo.
echo [1/5] Locating newest reaction-*.zip ...
powershell -NoProfile -Command "$z=Get-ChildItem 'C:\Users\Rhys' -Recurse -Filter 'reaction-*.zip' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if(-not $z){exit 1}; Write-Host ('      Using: '+$z.FullName); Set-Content -Encoding ascii '%TEMP%\rx_zip.txt' $z.FullName"
if errorlevel 1 (
  echo   ERROR: no reaction-*.zip found under C:\Users\Rhys. Download the zip first.
  pause
  exit /b 1
)
set /p RXZIP=<"%TEMP%\rx_zip.txt"

echo [2/5] Syncing with origin BEFORE touching the tree ...
cd /d %REPO%
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo   ERROR: could not sync with origin. The tree may have uncommitted
  echo   changes or a real conflict with someone else's push.
  echo   Nothing has been extracted; the repo is untouched.
  echo   Fix the git state, then run deploy.bat again.
  pause
  exit /b 1
)

echo [3/5] Extracting %RXZIP% into repo ...
powershell -NoProfile -Command "Expand-Archive -Path $env:RXZIP -DestinationPath '%REPO%' -Force; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[IO.Compression.ZipFile]::OpenRead($env:RXZIP); $zip.Entries | Where-Object { $_.FullName -notmatch '/$' } | ForEach-Object { $_.FullName } | Set-Content -Encoding ascii '%TEMP%\rx_files.txt'; $zip.Dispose()"
if errorlevel 1 (
  echo   ERROR: extraction failed. The repo may be partially updated - check git status.
  pause
  exit /b 1
)

echo [4/5] Staging deployed files ...
for /f "usebackq delims=" %%f in ("%TEMP%\rx_files.txt") do git add "%%f"

echo [5/5] Committing and pushing ...
git commit -m "Deploy drop (%date% %time%)"
git push origin main
if errorlevel 1 (
  echo.
  echo   ERROR: push rejected. Someone pushed while this deploy was running.
  echo   Run deploy.bat again - the commit is safe locally and step 2 will
  echo   rebase it onto their work.
  pause
  exit /b 1
)

del "%RXZIP%" >nul 2>&1
echo       Used zip deleted: %RXZIP%
echo.
echo ===== DEPLOY COMPLETE - check Vercel in ~90s =====
pause
