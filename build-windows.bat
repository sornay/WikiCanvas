@echo off
rem Builds the Wiki Canvas installer on Windows.
rem Needs: Rust (https://rustup.rs) and the "Desktop development with C++" part of the Visual Studio Build Tools.
cd /d "%~dp0"
where cargo >nul 2>nul
if errorlevel 1 (
  echo Rust is not installed. Get it from https://rustup.rs and run this file again.
  pause
  exit /b 1
)
cargo tauri --version >nul 2>nul
if errorlevel 1 (
  echo Installing the Tauri build tool, this takes a few minutes the first time...
  cargo install tauri-cli --version "^2" --locked
)
cargo tauri build
echo.
echo Done. The installer is in: src-tauri\target\release\bundle\nsis
pause
