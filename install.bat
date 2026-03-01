@echo off
:: install.bat – Vivaldi AI Tab Sorter setup (Windows)
:: Double-click this file to install the extension and Vivaldi bridge.

title Vivaldi AI Tab Sorter – Setup

PowerShell -ExecutionPolicy Bypass -File "%~dp0install.ps1"

echo.
echo Press any key to close...
pause >nul
