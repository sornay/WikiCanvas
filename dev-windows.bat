@echo off
rem Starts Wiki Canvas in development mode (a window opens; restarts when you change Rust code).
cd /d "%~dp0"
cargo tauri --version >nul 2>nul
if errorlevel 1 cargo install tauri-cli --version "^2" --locked
cargo tauri dev
