@echo off
REM Create a client demo login that works on BOTH login pages.
REM Usage:  create-demo-login.bat email@example.com Password123 "Full Name"
setlocal
if "%~2"=="" (
  echo Usage: create-demo-login.bat email password "Full Name"
  exit /b 1
)
set EMAIL=%~1
set PASS=%~2
set NAME=%~3

echo.
echo === 1/2  Reaction account (this repo) ===
node "%~dp0scripts\create-reaction-user.mjs" "%EMAIL%" "%PASS%" "%NAME%"

echo === 2/2  Vet demo account ===
REM Adjust this path if your vet repo lives elsewhere.
set VETDIR=C:\Users\Rhys\dev\southmoor-vet-db
if exist "%VETDIR%\package.json" (
  pushd "%VETDIR%"
  call npm run create-user -- "%EMAIL%" "%PASS%" "%NAME%"
  popd
) else (
  echo   ! Vet repo not found at %VETDIR%
  echo   ! Run the vet create-user manually there with the SAME email + password.
)
echo.
echo Done. The client can now sign in on both pages with:
echo    Email:    %EMAIL%
echo    Password: %PASS%
endlocal
