#!/usr/bin/env python3
"""
Windows Bot Launcher - Run Discord bot in Windows with Windows Ollama
This script ensures the bot runs in Windows environment with proper Ollama connection
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def main():
    """Launch Discord bot in Windows environment"""
    
    # Set current directory to bot location
    bot_dir = Path(__file__).parent.absolute()
    os.chdir(bot_dir)
    
    print("🚀 Starting Opure.exe Discord Bot in Windows...")
    print(f"📁 Working directory: {bot_dir}")
    print("🧠 Connecting to Windows Ollama at localhost:11434")
    
    # Check if we're in Windows
    if os.name != 'nt':
        print("❌ This script should be run in Windows, not WSL/Linux")
        print("💡 Please open Windows Terminal/PowerShell and run:")
        print(f"   cd {bot_dir}")
        print("   python start_windows_bot.py")
        sys.exit(1)
    
    # Check Python environment
    try:
        python_version = sys.version_info
        print(f"🐍 Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
            print("❌ Python 3.8+ required")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Python version check failed: {e}")
        sys.exit(1)
    
    # Check if Ollama is running
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            print(f"✅ Ollama connected - {len(models)} models available")
            
            # Check if 'opure' model exists
            opure_model = next((m for m in models if m.get('name', '').startswith('opure')), None)
            if opure_model:
                print(f"🧠 Found Opure AI model: {opure_model['name']}")
            else:
                print("⚠️  'opure' model not found - using first available model")
                if models:
                    print(f"📝 Available models: {', '.join([m.get('name', 'unknown') for m in models])}")
        else:
            print(f"⚠️  Ollama API returned status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Cannot connect to Ollama: {e}")
        print("💡 Please ensure Ollama is running in Windows:")
        print("   1. Open Windows Terminal/PowerShell as Administrator")
        print("   2. Run: ollama serve")
        print("   3. Or restart Ollama service")
        choice = input("\n🤔 Continue anyway? (y/N): ").lower().strip()
        if choice != 'y':
            sys.exit(1)
    
    # Install requirements if needed
    requirements_file = bot_dir / "requirements.txt"
    if requirements_file.exists():
        try:
            print("📦 Checking Python dependencies...")
            result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                                  capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                print(f"⚠️  Some packages may be missing: {result.stderr[:200]}")
        except Exception as e:
            print(f"⚠️  Could not install requirements: {e}")
    
    # Launch the bot
    bot_file = bot_dir / "bot.py"
    if not bot_file.exists():
        print(f"❌ bot.py not found at {bot_file}")
        sys.exit(1)
    
    print("\n🤖 Launching Discord Bot...")
    print("=" * 50)
    
    try:
        # Run the bot directly in Windows
        subprocess.run([sys.executable, "bot.py"], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Bot stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Bot crashed with exit code {e.returncode}")
        sys.exit(e.returncode)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()