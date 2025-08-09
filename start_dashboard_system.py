#!/usr/bin/env python3
"""
Complete Dashboard System Startup Script for Opure.exe
Starts WebSocket server and launches the 3D web dashboard
"""

import os
import sys
import time
import subprocess
import threading
import asyncio
import psutil
from pathlib import Path
import requests
import json
from datetime import datetime

class DashboardSystemManager:
    """Manages the complete 3D dashboard system startup"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.dashboard_path = self.base_path / "dashboard"
        self.websocket_server_path = self.base_path / "websocket_server.py"
        
        self.processes = {}
        self.is_running = False
        
    def print_banner(self):
        """Print startup banner"""
        print("\n" + "="*80)
        print("🎮 OPURE.EXE 3D DASHBOARD SYSTEM")
        print("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Made in Scotland 🔵 Rangers FC")
        print("⚡ RTX 5070 Ti Optimized • Next.js • Three.js • WebSocket")
        print("="*80)
        print(f"📁 Base Path: {self.base_path}")
        print(f"🌐 Dashboard: {self.dashboard_path}")
        print(f"🔌 WebSocket: {self.websocket_server_path}")
        print("="*80 + "\n")
    
    def check_prerequisites(self):
        """Check if all required components are present"""
        print("🔍 Checking prerequisites...")
        
        missing = []
        
        # Check Python packages
        required_packages = [
            'websockets', 'psutil', 'sqlite3', 'asyncio'
        ]
        
        for package in required_packages:
            try:
                __import__(package)
                print(f"  ✅ Python package: {package}")
            except ImportError:
                print(f"  ❌ Missing Python package: {package}")
                missing.append(f"pip install {package}")
        
        # Check Node.js and npm
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True, check=True)
            node_version = result.stdout.strip()
            print(f"  ✅ Node.js: {node_version}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("  ❌ Node.js not found")
            missing.append("Install Node.js from https://nodejs.org/")
        
        try:
            result = subprocess.run(['npm', '--version'], 
                                  capture_output=True, text=True, check=True)
            npm_version = result.stdout.strip()
            print(f"  ✅ npm: {npm_version}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("  ❌ npm not found")
            missing.append("Install npm (comes with Node.js)")
        
        # Check dashboard directory
        if self.dashboard_path.exists():
            print(f"  ✅ Dashboard directory: {self.dashboard_path}")
            
            # Check package.json
            package_json = self.dashboard_path / "package.json"
            if package_json.exists():
                print("  ✅ package.json found")
            else:
                print("  ❌ package.json not found")
                missing.append("Dashboard package.json missing")
                
        else:
            print(f"  ❌ Dashboard directory not found: {self.dashboard_path}")
            missing.append("Dashboard directory missing")
        
        # Check WebSocket server
        if self.websocket_server_path.exists():
            print(f"  ✅ WebSocket server: {self.websocket_server_path}")
        else:
            print(f"  ❌ WebSocket server not found: {self.websocket_server_path}")
            missing.append("WebSocket server script missing")
        
        if missing:
            print("\n❌ Prerequisites missing:")
            for item in missing:
                print(f"   • {item}")
            return False
        
        print("✅ All prerequisites satisfied!\n")
        return True
    
    def install_dashboard_dependencies(self):
        """Install dashboard dependencies"""
        print("📦 Installing dashboard dependencies...")
        
        try:
            os.chdir(self.dashboard_path)
            
            # Check if node_modules exists
            node_modules = self.dashboard_path / "node_modules"
            if node_modules.exists():
                print("  ✅ node_modules already exists, skipping install")
                return True
            
            # Install dependencies
            print("  🔄 Running npm install...")
            result = subprocess.run(['npm', 'install'], 
                                  capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print("  ✅ Dependencies installed successfully")
                return True
            else:
                print(f"  ❌ npm install failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("  ❌ npm install timed out (>5 minutes)")
            return False
        except Exception as e:
            print(f"  ❌ Error installing dependencies: {e}")
            return False
        finally:
            os.chdir(self.base_path)
    
    def start_websocket_server(self):
        """Start the WebSocket server in a separate process"""
        print("🔌 Starting WebSocket server...")
        
        try:
            env = os.environ.copy()
            env['PYTHONPATH'] = str(self.base_path)
            
            process = subprocess.Popen([
                sys.executable, str(self.websocket_server_path)
            ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.processes['websocket'] = process
            
            # Give it a moment to start
            time.sleep(3)
            
            # Check if it's still running
            if process.poll() is None:
                print("  ✅ WebSocket server started (PID: {})".format(process.pid))
                print("  🌐 WebSocket URL: ws://localhost:8001")
                return True
            else:
                stdout, stderr = process.communicate()
                print(f"  ❌ WebSocket server failed to start")
                print(f"  📄 stdout: {stdout.decode()}")
                print(f"  📄 stderr: {stderr.decode()}")
                return False
                
        except Exception as e:
            print(f"  ❌ Error starting WebSocket server: {e}")
            return False
    
    def start_dashboard(self):
        """Start the Next.js dashboard"""
        print("🌐 Starting 3D Dashboard...")
        
        try:
            os.chdir(self.dashboard_path)
            
            # Start Next.js development server
            process = subprocess.Popen([
                'npm', 'run', 'dev'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.processes['dashboard'] = process
            
            # Wait for dashboard to start
            print("  🔄 Waiting for dashboard to start...")
            max_attempts = 30
            for attempt in range(max_attempts):
                try:
                    response = requests.get('http://localhost:3001', timeout=2)
                    if response.status_code == 200:
                        print("  ✅ Dashboard started successfully!")
                        print("  🎮 Dashboard URL: http://localhost:3001")
                        return True
                except requests.RequestException:
                    pass
                
                time.sleep(2)
                
                # Check if process is still running
                if process.poll() is not None:
                    stdout, stderr = process.communicate()
                    print(f"  ❌ Dashboard process exited unexpectedly")
                    print(f"  📄 stdout: {stdout.decode()}")
                    print(f"  📄 stderr: {stderr.decode()}")
                    return False
            
            print("  ❌ Dashboard failed to start within 60 seconds")
            return False
            
        except Exception as e:
            print(f"  ❌ Error starting dashboard: {e}")
            return False
        finally:
            os.chdir(self.base_path)
    
    def check_system_status(self):
        """Check the status of all components"""
        print("\n📊 System Status Check:")
        
        # Check WebSocket server
        try:
            import websocket
            ws = websocket.create_connection("ws://localhost:8001", timeout=5)
            ws.close()
            print("  ✅ WebSocket Server: RUNNING")
        except Exception:
            print("  ❌ WebSocket Server: NOT ACCESSIBLE")
        
        # Check Dashboard
        try:
            response = requests.get('http://localhost:3001', timeout=5)
            if response.status_code == 200:
                print("  ✅ 3D Dashboard: RUNNING")
            else:
                print(f"  ⚠️ 3D Dashboard: HTTP {response.status_code}")
        except requests.RequestException:
            print("  ❌ 3D Dashboard: NOT ACCESSIBLE")
        
        # Check processes
        for name, process in self.processes.items():
            if process.poll() is None:
                print(f"  ✅ {name.title()} Process: PID {process.pid}")
            else:
                print(f"  ❌ {name.title()} Process: TERMINATED")
    
    def monitor_system(self):
        """Monitor system health"""
        print("\n🔍 Starting system monitoring...")
        print("📖 Logs will be displayed below. Press Ctrl+C to stop.\n")
        
        try:
            while self.is_running:
                time.sleep(30)  # Check every 30 seconds
                
                # Check if processes are still running
                failed_processes = []
                for name, process in self.processes.items():
                    if process.poll() is not None:
                        failed_processes.append(name)
                
                if failed_processes:
                    print(f"⚠️ {datetime.now()}: Processes failed: {', '.join(failed_processes)}")
                
                # System resource check
                cpu = psutil.cpu_percent()
                memory = psutil.virtual_memory()
                
                if cpu > 90:
                    print(f"⚠️ {datetime.now()}: High CPU usage: {cpu}%")
                
                if memory.percent > 90:
                    print(f"⚠️ {datetime.now()}: High memory usage: {memory.percent}%")
                
        except KeyboardInterrupt:
            pass
    
    def shutdown_system(self):
        """Shutdown all components gracefully"""
        print("\n🛑 Shutting down dashboard system...")
        
        self.is_running = False
        
        for name, process in self.processes.items():
            try:
                print(f"  🔄 Stopping {name}...")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=10)
                    print(f"  ✅ {name} stopped gracefully")
                except subprocess.TimeoutExpired:
                    print(f"  ⚡ Force killing {name}...")
                    process.kill()
                    process.wait()
                    print(f"  ✅ {name} force stopped")
                    
            except Exception as e:
                print(f"  ❌ Error stopping {name}: {e}")
        
        print("🔌 Dashboard system shutdown complete")
    
    def show_urls(self):
        """Show important URLs"""
        print("\n🌐 Important URLs:")
        print("  📊 3D Dashboard:     http://localhost:3001")
        print("  🔌 WebSocket Server: ws://localhost:8001")
        print("  📱 Mobile Access:    http://<your-ip>:3001")
        print("\n🎮 Dashboard Features:")
        print("  • 3D Command Center with Three.js visualizations")
        print("  • Real-time RTX 5070 Ti GPU monitoring")
        print("  • Discord Activities integration (opure.uk)")
        print("  • AI Analytics for gpt-oss:20b model")
        print("  • Live WebSocket data streaming")
        print("  • Economy & Gaming statistics")
        print("  • Scottish/Rangers FC themed interface")
        print()
    
    def run(self):
        """Main run method"""
        try:
            self.print_banner()
            
            # Check prerequisites
            if not self.check_prerequisites():
                print("❌ Please install missing prerequisites and try again.")
                return False
            
            # Install dependencies
            if not self.install_dashboard_dependencies():
                print("❌ Failed to install dashboard dependencies.")
                return False
            
            # Start WebSocket server
            if not self.start_websocket_server():
                print("❌ Failed to start WebSocket server.")
                return False
            
            # Start dashboard
            if not self.start_dashboard():
                print("❌ Failed to start dashboard.")
                self.shutdown_system()
                return False
            
            # Show status
            self.check_system_status()
            self.show_urls()
            
            # Set running flag
            self.is_running = True
            
            # Monitor system
            self.monitor_system()
            
            return True
            
        except KeyboardInterrupt:
            print("\n🛑 Shutdown requested by user")
        except Exception as e:
            print(f"❌ System error: {e}")
        finally:
            self.shutdown_system()
        
        return False

def main():
    """Main entry point"""
    manager = DashboardSystemManager()
    
    try:
        success = manager.run()
        if success:
            print("✅ Dashboard system completed successfully")
        else:
            print("❌ Dashboard system failed")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()