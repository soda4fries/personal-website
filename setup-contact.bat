@echo off
REM Setup script for Anonymous Contact Message System (Windows)
REM This script creates a virtual environment and installs all required dependencies

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "VENV_DIR=%SCRIPT_DIR%contact-venv"

echo 🚀 Setting up Anonymous Contact Message System...
echo 📍 Working directory: %SCRIPT_DIR%

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set "PYTHON_VERSION=%%i"
echo 🐍 Found Python %PYTHON_VERSION%

REM Check if virtual environment already exists
if exist "%VENV_DIR%" (
    echo 📁 Virtual environment already exists at: %VENV_DIR%
    set /p "RECREATE=Do you want to recreate it? (y/N): "
    if /i "!RECREATE!"=="y" (
        echo 🗑️  Removing existing virtual environment...
        rmdir /s /q "%VENV_DIR%"
    ) else (
        echo ✅ Using existing virtual environment
    )
)

REM Create virtual environment if it doesn't exist
if not exist "%VENV_DIR%" (
    echo 📦 Creating virtual environment...
    python -m venv "%VENV_DIR%"
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
if exist "%SCRIPT_DIR%requirements.txt" (
    echo 📋 Installing requirements from requirements.txt...
    pip install -r "%SCRIPT_DIR%requirements.txt"
) else (
    echo 📋 Installing requirements directly...
    pip install fastapi uvicorn[standard] click rich pydantic python-multipart
)

echo.
echo ✅ Setup completed successfully!
echo.
echo 🎯 Next steps:
echo 1. Set your admin password:
echo    set CONTACT_ADMIN_PASSWORD=your_secure_password
echo.
echo 2. Activate the virtual environment:
echo    %VENV_DIR%\Scripts\activate.bat
echo.
echo 3. Start the contact system:
echo    python contact-me.py                    # Start API server
echo    python contact-me.py --cli              # Interactive CLI mode
echo    python contact-me.py --list             # List messages
echo    python contact-me.py --help             # Show all options
echo.
echo 📊 API will be available at: http://localhost:8000
echo 📁 Database will be created as: contact_messages.db
echo.
echo 🔧 To deactivate the virtual environment later, run: deactivate

pause