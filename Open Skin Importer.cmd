@echo off
setlocal
where pythonw.exe >nul 2>&1
if not errorlevel 1 (
    start "" pythonw.exe "%~dp0tools\skin_importer_gui.py"
    exit /b
)
where python.exe >nul 2>&1
if errorlevel 1 (
    echo Python was not found. Install Python 3.10 or newer, then open this file again.
    pause
    exit /b 1
)
python.exe "%~dp0tools\skin_importer_gui.py"
if errorlevel 1 pause
