@echo off
setlocal
where pythonw.exe >nul 2>&1
if not errorlevel 1 (
    start "" pythonw.exe "%~dp0app\launcher.py"
    exit /b
)
where python.exe >nul 2>&1
if errorlevel 1 (
    echo Install Python 3.10 or newer, then double-click Open CHESSNITE again.
    pause
    exit /b 1
)
start "CHESSNITE" /min python.exe "%~dp0app\launcher.py"
