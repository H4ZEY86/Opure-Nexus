@echo off
REM Windows Batch Script to Launch Opure.exe Discord Bot
REM This ensures the bot runs in Windows with proper Ollama connection

echo 🚀 Starting Opure.exe Discord Bot in Windows...
echo.

REM Change to the bot directory
cd /d "%~dp0"
echo 📁 Working directory: %CD%

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found in PATH
    echo 💡 Please install Python 3.8+ and add to PATH
    pause
    exit /b 1
)

REM Display Python version
echo 🐍 Python version:
python --version

REM Check if Ollama is running
echo.
echo 🧠 Checking Ollama connection...
curl -s --connect-timeout 5 http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Cannot connect to Ollama at localhost:11434
    echo 💡 Please ensure Ollama is running:
    echo    1. Open Windows Terminal as Administrator
    echo    2. Run: ollama serve
    echo    3. Or restart Ollama service
    echo.
    set /p continue="🤔 Continue anyway? (y/N): "
    if /i not "%continue%"=="y" (
        echo Exiting...
        pause
        exit /b 1
    )
) else (
    echo ✅ Ollama is running and accessible
)

REM Install requirements if needed
if exist requirements.txt (
    echo.
    echo 📦 Installing Python dependencies...
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo ⚠️  Some packages may have failed to install
        echo 💡 Consider using a virtual environment or checking permissions
    )
)

REM Launch the bot
echo.
echo 🤖 Launching Discord Bot...
echo ================================================
echo.

python bot.py
if errorlevel 1 (
    echo.
    echo ❌ Bot exited with error code %errorlevel%
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Bot stopped cleanly
pause