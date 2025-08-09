#!/usr/bin/env python3
"""
Complete System Startup Script
Launches Discord Bot, WebSocket Server, and Dashboard in coordinated sequence
"""

import asyncio
import subprocess
import sys
import os
import time
import signal
import logging
from pathlib import Path
from typing import List, Optional

# Configure logging with Windows-compatible encoding
base_path = Path(__file__).parent.absolute()
logs_dir = base_path / 'logs'
logs_dir.mkdir(exist_ok=True)

# Create stream handler with UTF-8 encoding for Windows
stream_handler = logging.StreamHandler()
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(logs_dir / 'system_startup.log', encoding='utf-8'),
        stream_handler
    ]
)
logger = logging.getLogger(__name__)

class OpureSystemManager:
    """Manages the complete Opure.exe system startup and coordination"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.absolute()
        self.processes: List[subprocess.Popen] = []
        self.running = False
        
        # Process configurations with Windows compatibility
        npm_cmd = 'npm.cmd' if sys.platform.startswith('win') else 'npm'
        self.services = {
            'websocket_server': {
                'cmd': [sys.executable, 'websocket_server.py'],
                'cwd': self.base_path,
                'required': True,
                'startup_delay': 2
            },
            'discord_bot': {
                'cmd': [sys.executable, 'bot.py'],
                'cwd': self.base_path,
                'required': True,
                'startup_delay': 5
            },
            'dashboard': {
                'cmd': [npm_cmd, 'run', 'dev'],
                'cwd': self.base_path / 'dashboard',
                'required': False,
                'startup_delay': 10
            }
        }
    
    async def check_dependencies(self) -> bool:
        """Check if all required dependencies are available"""
        try:
            logger.info("🔍 Checking system dependencies...")
            
            # Check Python packages
            required_python_packages = [
                'discord.py', 'aiohttp', 'asyncio', 'sqlite3',
                'websockets', 'psutil', 'chromadb', 'GPUtil'
            ]
            
            missing_packages = []
            for package in required_python_packages:
                try:
                    __import__(package.replace('-', '_').replace('.py', ''))
                except ImportError:
                    missing_packages.append(package)
            
            if missing_packages:
                logger.error(f"❌ Missing Python packages: {', '.join(missing_packages)}")
                logger.error("Install with: pip install " + ' '.join(missing_packages))
                return False
            
            # Check Node.js for dashboard
            npm_cmd = 'npm.cmd' if sys.platform.startswith('win') else 'npm'
            try:
                result = subprocess.run(['node', '--version'], capture_output=True, text=True)
                if result.returncode == 0:
                    logger.info(f"✅ Node.js version: {result.stdout.strip()}")
                    # Test npm command
                    npm_result = subprocess.run([npm_cmd, '--version'], capture_output=True, text=True)
                    if npm_result.returncode == 0:
                        logger.info(f"✅ npm version: {npm_result.stdout.strip()}")
                    else:
                        logger.warning("⚠️ npm command not working - Dashboard may fail")
                else:
                    logger.warning("⚠️ Node.js not found - Dashboard will be unavailable")
            except FileNotFoundError:
                logger.warning("⚠️ Node.js not found - Dashboard will be unavailable")
                self.services['dashboard']['required'] = False
            
            # Check database file
            db_path = self.base_path / 'opure.db'
            if not db_path.exists():
                logger.warning("⚠️ Database file not found - Will be created on first run")
            
            # Load environment variables from .env file
            env_path = self.base_path / '.env'
            if env_path.exists():
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.strip() and not line.startswith('#'):
                            key, value = line.strip().split('=', 1)
                            os.environ[key] = value
            
            # Check Discord token
            discord_token = os.getenv('DISCORD_TOKEN') or os.getenv('BOT_TOKEN')
            if not discord_token:
                logger.error("❌ DISCORD_TOKEN or BOT_TOKEN environment variable not set")
                return False
            
            logger.info("✅ All dependencies check passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Dependency check failed: {e}")
            return False
    
    async def start_service(self, service_name: str, config: dict) -> Optional[subprocess.Popen]:
        """Start a single service"""
        try:
            logger.info(f"🚀 Starting {service_name}...")
            
            # Create logs directory if it doesn't exist
            logs_dir = self.base_path / 'logs'
            logs_dir.mkdir(exist_ok=True)
            
            # Setup log files
            stdout_file = logs_dir / f"{service_name}_stdout.log"
            stderr_file = logs_dir / f"{service_name}_stderr.log"
            
            # Start the process with Windows compatibility
            process = subprocess.Popen(
                config['cmd'],
                cwd=config['cwd'],
                stdout=open(stdout_file, 'a'),
                stderr=open(stderr_file, 'a'),
                env=os.environ.copy(),
                shell=sys.platform.startswith('win') and service_name == 'dashboard'
            )
            
            # Wait for startup delay
            await asyncio.sleep(config['startup_delay'])
            
            # Check if process is still running
            if process.poll() is None:
                logger.info(f"✅ {service_name} started successfully (PID: {process.pid})")
                self.processes.append(process)
                return process
            else:
                logger.error(f"❌ {service_name} failed to start")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to start {service_name}: {e}")
            return None
    
    async def install_dashboard_deps(self) -> bool:
        """Install dashboard dependencies"""
        try:
            dashboard_path = self.base_path / 'dashboard'
            if not dashboard_path.exists():
                logger.warning("⚠️ Dashboard directory not found, skipping...")
                return False
            
            logger.info("📦 Installing dashboard dependencies...")
            
            # Check if package.json exists
            package_json = dashboard_path / 'package.json'
            if not package_json.exists():
                logger.error("❌ Dashboard package.json not found")
                return False
            
            # Use correct npm command for Windows
            npm_cmd = 'npm.cmd' if sys.platform.startswith('win') else 'npm'
            
            # Install dependencies
            result = subprocess.run(
                [npm_cmd, 'install'],
                cwd=dashboard_path,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                shell=sys.platform.startswith('win')  # Use shell on Windows
            )
            
            if result.returncode == 0:
                logger.info("✅ Dashboard dependencies installed")
                return True
            else:
                logger.error(f"❌ Dashboard dependency installation failed: {result.stderr}")
                logger.error(f"Command output: {result.stdout}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("❌ Dashboard dependency installation timed out")
            return False
        except Exception as e:
            logger.error(f"❌ Dashboard dependency installation error: {e}")
            return False
    
    async def start_all_services(self):
        """Start all services in order"""
        try:
            logger.info("🚀 Starting Opure.exe Complete System...")
            
            # Check dependencies first
            if not await self.check_dependencies():
                logger.error("❌ Dependency check failed - Cannot start system")
                return False
            
            # Install dashboard dependencies if needed
            dashboard_path = self.base_path / 'dashboard'
            if dashboard_path.exists() and not (dashboard_path / 'node_modules').exists():
                await self.install_dashboard_deps()
            
            # Start services in order
            for service_name, config in self.services.items():
                if config.get('required', True) or service_name == 'dashboard':
                    process = await self.start_service(service_name, config)
                    
                    if process is None and config.get('required', True):
                        logger.error(f"❌ Required service {service_name} failed to start")
                        await self.stop_all_services()
                        return False
            
            self.running = True
            logger.info("✅ All services started successfully!")
            logger.info("🌐 System URLs:")
            logger.info("   • Dashboard: http://localhost:3001")
            logger.info("   • WebSocket: ws://localhost:8001")
            logger.info("   • Activity: https://www.opure.uk")
            logger.info("   • API: https://api.opure.uk")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ System startup failed: {e}")
            await self.stop_all_services()
            return False
    
    async def stop_all_services(self):
        """Stop all running services"""
        try:
            logger.info("🛑 Stopping all services...")
            
            self.running = False
            
            for process in reversed(self.processes):  # Stop in reverse order
                try:
                    if process.poll() is None:  # Process still running
                        logger.info(f"🛑 Stopping process {process.pid}")
                        process.terminate()
                        
                        # Wait up to 10 seconds for graceful shutdown
                        for _ in range(10):
                            if process.poll() is not None:
                                break
                            await asyncio.sleep(1)
                        
                        # Force kill if still running
                        if process.poll() is None:
                            logger.warning(f"⚠️ Force killing process {process.pid}")
                            process.kill()
                            
                except Exception as e:
                    logger.error(f"❌ Error stopping process: {e}")
            
            self.processes.clear()
            logger.info("✅ All services stopped")
            
        except Exception as e:
            logger.error(f"❌ Error during shutdown: {e}")
    
    async def monitor_services(self):
        """Monitor services and restart if needed"""
        try:
            while self.running:
                # Check each process
                for i, process in enumerate(self.processes.copy()):
                    if process.poll() is not None:  # Process died
                        service_name = list(self.services.keys())[i]
                        logger.warning(f"⚠️ Service {service_name} died, restarting...")
                        
                        # Remove dead process
                        self.processes.remove(process)
                        
                        # Restart service
                        config = self.services[service_name]
                        new_process = await self.start_service(service_name, config)
                        
                        if new_process is None and config.get('required', True):
                            logger.error(f"❌ Failed to restart required service {service_name}")
                            await self.stop_all_services()
                            break
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
        except Exception as e:
            logger.error(f"❌ Service monitoring error: {e}")
    
    async def run_system(self):
        """Run the complete system"""
        try:
            # Setup signal handlers for graceful shutdown
            def signal_handler(signum, frame):
                logger.info(f"🔔 Received signal {signum}, shutting down...")
                asyncio.create_task(self.stop_all_services())
            
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
            
            # Start all services
            if await self.start_all_services():
                # Start monitoring
                await self.monitor_services()
            
        except KeyboardInterrupt:
            logger.info("🔔 Keyboard interrupt received")
        except Exception as e:
            logger.error(f"❌ System error: {e}")
        finally:
            await self.stop_all_services()

# CLI Interface
async def main():
    """Main entry point"""
    try:
        print("🚀 Opure.exe Complete System Manager")
        print("=" * 50)
        
        manager = OpureSystemManager()
        await manager.run_system()
        
    except Exception as e:
        logger.error(f"❌ System manager failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())