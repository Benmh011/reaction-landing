@echo off
setlocal
set REPO=C:\Users\Rhys\Reaction
cd /d %REPO%

echo.
echo [1/5] Syncing with origin ...
git -c gc.auto=0 pull --rebase origin main
if errorlevel 1 ( echo   ERROR: pull failed - resolve above, then re-run. & pause & exit /b 1 )

echo [2/5] Locating newest reaction-*.zip ...
powershell -NoProfile -Command "$z=Get-ChildItem 'C:\Users\Rhys' -Recurse -Filter 'reaction-*.zip' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if(-not $z){exit 1}; Write-Host ('      Using: '+$z.FullName); Expand-Archive -Path $z.FullName -DestinationPath '%REPO%' -Force; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[IO.Compression.ZipFile]::OpenRead($z.FullName); $zip.Entries | Where-Object { $_.FullName -notmatch '/$' } | ForEach-Object { $_.FullName } | Set-Content -Encoding ascii '%TEMP%\rx_files.txt'; $zip.Dispose()"
if errorlevel 1 ( echo   ERROR: no reaction-*.zip found. Download the zip first. & pause & exit /b 1 )

echo [3/5] Staging deployed files ...
for /f "usebackq delims=" %%f in ("%TEMP%\rx_files.txt") do git add "%%f"

echo [4/5] Committing ...
git -c gc.auto=0 commit -m "Deploy drop (%date% %time%)"

echo [5/5] Pushing ...
git -c gc.auto=0 push origin main
if errorlevel 1 ( echo   ERROR: push failed - run git push manually. & pause & exit /b 1 )

echo.
echo ===== DEPLOY COMPLETE - check Vercel in ~90s =====
pause