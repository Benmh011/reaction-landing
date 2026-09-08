@echo off
setlocal

REM ————————————————————————————————————————————————————————————————
REM Provenance update runner.
REM
REM   update-provenance.bat install-something.js "Commit message"
REM
REM Finds the installer here or in Downloads, runs it, builds, clears
REM backups, stages, shows what is staged, and asks before committing.
REM
REM Fails safe: a broken install or build stops here with the .bak
REM files intact and nothing committed.
REM ————————————————————————————————————————————————————————————————

if "%~2"=="" (
  echo.
  echo Usage:  update-provenance.bat ^<installer.js^> "commit message"
  echo.
  exit /b 1
)

set "INSTALLER=%~1"
set "MSG=%~2"

if not exist "%INSTALLER%" (
  if exist "%USERPROFILE%\Downloads\%INSTALLER%" (
    move "%USERPROFILE%\Downloads\%INSTALLER%" . >nul
    echo Moved %INSTALLER% in from Downloads.
  ) else (
    echo Cannot find %INSTALLER% here or in Downloads.
    exit /b 1
  )
)

echo.
echo === 1/6  Install ===
node "%INSTALLER%"
if errorlevel 1 (
  echo.
  echo Install stopped. Nothing was committed.
  exit /b 1
)

echo.
echo === 2/6  Install packages ===
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Backups are still in place and nothing was committed.
  exit /b 1
)

echo.
echo === 3/6  Build ===
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed. Backups are still in place and nothing was committed.
  echo The .bak files next to each changed file are your undo.
  exit /b 1
)

echo.
echo === 4/6  Clean up ===
echo Removing:
dir /b app\demos\provenance\*.bak 2>nul
dir /b public\samples\*.bak 2>nul
dir /b package.json.*.bak 2>nul
del /q app\demos\provenance\*.bak 2>nul
del /q public\samples\*.bak 2>nul
del /q package.json.*.bak 2>nul
del /q "%INSTALLER%"
echo   and %INSTALLER%

echo.
echo === 5/6  Stage ===
git add app\demos\provenance public\samples package.json package-lock.json update-provenance.bat
echo.
echo Staged:
git status --short
echo.
choice /c YN /m "Commit and push the above"
if errorlevel 2 (
  echo.
  echo Left staged, not committed. Review with: git status
  exit /b 0
)

echo.
echo === 6/6  Commit and push ===
git commit -m "%MSG%"
if errorlevel 1 (
  echo Commit failed.
  exit /b 1
)
git push
if errorlevel 1 (
  echo Push failed. The commit is local — run: git push
  exit /b 1
)

echo.
echo Done. Vercel is building main.
endlocal
