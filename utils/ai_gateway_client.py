"""
AI Gateway Client - Python Integration for Discord Bot
Optimized communication with the Node.js AI Gateway service
"""

import asyncio
import aiohttp
import json
import time
import logging
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import websockets
import threading
from contextlib import asynccontextmanager
import traceback

# Configure logging
logger = logging.getLogger(__name__)

class ContentType(Enum):
    MESSAGE = "message"
    MARKETPLACE_ITEM = "marketplace_item"
    GAME_ACTION = "game_action"
    ACHIEVEMENT = "achievement"
    OTHER = "other"

class Priority(Enum):
    URGENT = "urgent"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"

@dataclass
class AIMessage:
    role: str  # 'system', 'user', 'assistant'
    content: str
    images: Optional[List[str]] = None

@dataclass
class AIRequest:
    model: str
    messages: List[AIMessage]
    options: Optional[Dict[str, Any]] = None
    priority: Priority = Priority.NORMAL
    conversation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class AIResponse:
    success: bool
    content: Optional[str] = None
    model: Optional[str] = None
    processing_time: Optional[float] = None
    total_time: Optional[float] = None
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

@dataclass
class TokenEvaluation:
    content: str
    content_type: ContentType
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class TokenResult:
    approved: bool
    amount: int
    quality: Dict[str, float]
    fraud: Dict[str, Any]
    calculation: Optional[Dict[str, Any]] = None

class AIGatewayError(Exception):
    """Custom exception for AI Gateway errors"""
    
    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code

class AIGatewayClient:
    """
    High-performance client for communicating with the AI Gateway
    Supports both HTTP REST API and WebSocket connections
    """
    
    def __init__(
        self,
        gateway_url: str = "http://localhost:3002",
        api_key: Optional[str] = None,
        jwt_token: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        enable_websocket: bool = True
    ):
        self.gateway_url = gateway_url.rstrip('/')
        self.api_key = api_key
        self.jwt_token = jwt_token
        self.timeout = timeout
        self.max_retries = max_retries
        self.enable_websocket = enable_websocket
        
        # HTTP session
        self.session: Optional[aiohttp.ClientSession] = None
        
        # WebSocket connection
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.ws_connected = False
        self.ws_lock = asyncio.Lock()
        self.ws_reconnect_task: Optional[asyncio.Task] = None
        
        # Event handlers
        self.event_handlers: Dict[str, List[callable]] = {}
        
        # Performance tracking
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def initialize(self):
        """Initialize the client and establish connections"""
        # Create HTTP session
        headers = {}
        if self.api_key:
            headers['X-API-Key'] = self.api_key
        if self.jwt_token:
            headers['Authorization'] = f'Bearer {self.jwt_token}'
        
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        self.session = aiohttp.ClientSession(
            headers=headers,
            timeout=timeout,
            connector=aiohttp.TCPConnector(
                limit=10,
                limit_per_host=5,
                keepalive_timeout=30,
                enable_cleanup_closed=True
            )
        )
        
        # Test connection
        try:
            await self.health_check()
            logger.info(f"AI Gateway client initialized: {self.gateway_url}")
        except Exception as e:
            logger.error(f"Failed to connect to AI Gateway: {e}")
            raise AIGatewayError(f"Gateway connection failed: {e}")
        
        # Initialize WebSocket if enabled
        if self.enable_websocket:
            await self.connect_websocket()
    
    async def close(self):
        """Close all connections and cleanup"""
        # Close WebSocket
        if self.websocket:
            await self.websocket.close()
            self.ws_connected = False
        
        if self.ws_reconnect_task:
            self.ws_reconnect_task.cancel()
            try:
                await self.ws_reconnect_task
            except asyncio.CancelledError:
                pass
        
        # Close HTTP session
        if self.session:
            await self.session.close()
        
        logger.info("AI Gateway client closed")
    
    # HTTP API Methods
    
    async def health_check(self) -> Dict[str, Any]:
        """Check gateway health status"""
        response = await self._make_request('GET', '/api/v1/health')
        return response
    
    async def generate_ai_response(self, request: AIRequest) -> AIResponse:
        """Generate AI response using the specified model"""
        start_time = time.time()
        
        try:
            payload = {
                'model': request.model,
                'messages': [asdict(msg) for msg in request.messages],
                'priority': request.priority.value,
                'conversationId': request.conversation_id,
                'metadata': request.metadata
            }
            
            if request.options:
                payload['options'] = request.options
            
            response_data = await self._make_request('POST', '/api/v1/models/generate', payload)
            
            total_time = time.time() - start_time
            self._update_metrics(total_time, True)
            
            return AIResponse(
                success=response_data.get('success', False),
                content=response_data.get('content'),
                model=response_data.get('model'),
                processing_time=response_data.get('metrics', {}).get('processingTime'),
                total_time=total_time * 1000,  # Convert to milliseconds
                metrics=response_data.get('metrics')
            )
            
        except Exception as e:
            total_time = time.time() - start_time
            self._update_metrics(total_time, False)
            
            return AIResponse(
                success=False,
                error=str(e),
                total_time=total_time * 1000
            )
    
    async def generate_batch_responses(self, requests: List[AIRequest]) -> List[AIResponse]:
        """Generate multiple AI responses in batch"""
        payload = {
            'requests': [
                {
                    'model': req.model,
                    'messages': [asdict(msg) for msg in req.messages],
                    'priority': req.priority.value,
                    'conversationId': req.conversation_id,
                    'metadata': req.metadata,
                    **(({'options': req.options} if req.options else {}))
                }
                for req in requests
            ]
        }
        
        response_data = await self._make_request('POST', '/api/v1/models/batch', payload)
        
        # Convert responses
        responses = []
        for resp in response_data.get('responses', []):
            responses.append(AIResponse(
                success=resp.get('success', False),
                content=resp.get('content'),
                model=resp.get('model'),
                processing_time=resp.get('processingTime'),
                error=resp.get('error')
            ))
        
        return responses
    
    async def evaluate_content_for_tokens(self, evaluation: TokenEvaluation) -> TokenResult:
        """Evaluate content quality and calculate token rewards"""
        payload = {
            'content': evaluation.content,
            'contentType': evaluation.content_type.value,
            'metadata': evaluation.metadata
        }
        
        response_data = await self._make_request('POST', '/api/v1/tokens/evaluate', payload)
        
        eval_data = response_data.get('evaluation', {})
        
        return TokenResult(
            approved=eval_data.get('approved', False),
            amount=eval_data.get('amount', 0),
            quality=eval_data.get('quality', {}),
            fraud=eval_data.get('fraud', {}),
            calculation=eval_data.get('calculation')
        )
    
    async def validate_content(self, content: str, content_type: ContentType) -> Dict[str, Any]:
        """Validate content before submission"""
        payload = {
            'content': content,
            'contentType': content_type.value
        }
        
        return await self._make_request('POST', '/api/v1/tokens/validate', payload)
    
    async def get_model_status(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Get AI model status and resource usage"""
        if model_name:
            return await self._make_request('GET', f'/api/v1/models/{model_name}/status')
        else:
            return await self._make_request('GET', '/api/v1/models')
    
    async def get_analytics(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get system analytics and performance metrics"""
        if user_id:
            return await self._make_request('GET', f'/api/v1/tokens/analytics/{user_id}')
        else:
            return await self._make_request('GET', '/api/v1/analytics/overview')
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get detailed performance metrics"""
        return await self._make_request('GET', '/api/v1/analytics/performance')
    
    # WebSocket Methods
    
    async def connect_websocket(self):
        """Establish WebSocket connection for real-time features"""
        if not self.enable_websocket:
            return
        
        async with self.ws_lock:
            if self.ws_connected:
                return
            
            try:
                ws_url = self.gateway_url.replace('http://', 'ws://').replace('https://', 'wss://')
                
                headers = {}
                if self.api_key:
                    headers['x-api-key'] = self.api_key
                
                extra_headers = []
                if self.jwt_token:
                    extra_headers.append(('Authorization', f'Bearer {self.jwt_token}'))
                if self.api_key:
                    extra_headers.append(('X-API-Key', self.api_key))
                
                self.websocket = await websockets.connect(
                    f"{ws_url}/socket.io/?transport=websocket",
                    extra_headers=extra_headers,
                    ping_interval=25,
                    ping_timeout=60
                )
                
                self.ws_connected = True
                logger.info("WebSocket connection established")
                
                # Start message handler
                asyncio.create_task(self._handle_websocket_messages())
                
                # Start auto-reconnect task
                self.ws_reconnect_task = asyncio.create_task(self._websocket_keepalive())
                
            except Exception as e:
                logger.error(f"WebSocket connection failed: {e}")
                self.ws_connected = False
    
    async def _handle_websocket_messages(self):
        """Handle incoming WebSocket messages"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    event_type = data.get('type')
                    
                    if event_type and event_type in self.event_handlers:
                        for handler in self.event_handlers[event_type]:
                            try:
                                await handler(data.get('data', {}))
                            except Exception as e:
                                logger.error(f"Error in event handler {handler}: {e}")
                
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received: {message}")
                except Exception as e:
                    logger.error(f"Error handling WebSocket message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
            self.ws_connected = False
        except Exception as e:
            logger.error(f"WebSocket handler error: {e}")
            self.ws_connected = False
    
    async def _websocket_keepalive(self):
        """Keep WebSocket connection alive and handle reconnections"""
        while self.enable_websocket:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                if not self.ws_connected and self.enable_websocket:
                    logger.info("Attempting WebSocket reconnection...")
                    await self.connect_websocket()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"WebSocket keepalive error: {e}")
                await asyncio.sleep(10)  # Wait before retry
    
    def on_event(self, event_type: str, handler: callable):
        """Register event handler for WebSocket events"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
    
    async def emit_websocket_event(self, event_type: str, data: Dict[str, Any]):
        """Emit event via WebSocket"""
        if not self.ws_connected or not self.websocket:
            raise AIGatewayError("WebSocket not connected")
        
        message = json.dumps({
            'type': event_type,
            'data': data
        })
        
        await self.websocket.send(message)
    
    async def stream_ai_response(
        self, 
        request: AIRequest, 
        chunk_handler: callable
    ) -> AIResponse:
        """Stream AI response with real-time chunks"""
        if not self.ws_connected:
            # Fallback to regular generation
            return await self.generate_ai_response(request)
        
        response_future = asyncio.Future()
        chunks = []
        
        async def handle_chunk(data):
            content = data.get('content', '')
            progress = data.get('progress', 0)
            chunks.append(content)
            await chunk_handler(content, progress)
        
        async def handle_complete(data):
            total_content = ''.join(chunks)
            response_future.set_result(AIResponse(
                success=True,
                content=total_content,
                model=data.get('model'),
                processing_time=data.get('totalTime'),
                total_time=data.get('totalTime')
            ))
        
        async def handle_error(data):
            response_future.set_result(AIResponse(
                success=False,
                error=data.get('error')
            ))
        
        # Register temporary handlers
        self.on_event('ai:stream:chunk', handle_chunk)
        self.on_event('ai:stream:complete', handle_complete)
        self.on_event('ai:stream:error', handle_error)
        
        try:
            # Start streaming
            await self.emit_websocket_event('ai:stream', {
                'model': request.model,
                'messages': [asdict(msg) for msg in request.messages],
                'options': request.options
            })
            
            # Wait for completion
            response = await response_future
            return response
            
        finally:
            # Cleanup handlers
            self.event_handlers.get('ai:stream:chunk', []).clear()
            self.event_handlers.get('ai:stream:complete', []).clear()
            self.event_handlers.get('ai:stream:error', []).clear()
    
    # Private Methods
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic"""
        if not self.session:
            raise AIGatewayError("Client not initialized")
        
        url = f"{self.gateway_url}{endpoint}"
        
        for attempt in range(self.max_retries + 1):
            try:
                kwargs = {'url': url}
                
                if data:
                    kwargs['json'] = data
                
                async with self.session.request(method, **kwargs) as response:
                    response_data = await response.json()
                    
                    if response.status >= 400:
                        error_message = response_data.get('message', f'HTTP {response.status}')
                        error_code = response_data.get('code', f'HTTP_{response.status}')
                        
                        raise AIGatewayError(
                            error_message,
                            code=error_code,
                            status_code=response.status
                        )
                    
                    return response_data
                    
            except aiohttp.ClientError as e:
                if attempt == self.max_retries:
                    raise AIGatewayError(f"Network error after {self.max_retries + 1} attempts: {e}")
                
                # Exponential backoff
                wait_time = 2 ** attempt
                logger.warning(f"Request failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                await asyncio.sleep(wait_time)
            
            except Exception as e:
                raise AIGatewayError(f"Request failed: {e}")
    
    def _update_metrics(self, response_time: float, success: bool):
        """Update performance metrics"""
        self.request_count += 1
        self.total_response_time += response_time
        
        if not success:
            self.error_count += 1
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get client performance statistics"""
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0
        )
        
        success_rate = (
            (self.request_count - self.error_count) / self.request_count * 100
            if self.request_count > 0 else 0
        )
        
        return {
            'total_requests': self.request_count,
            'total_errors': self.error_count,
            'success_rate': success_rate,
            'average_response_time': avg_response_time,
            'websocket_connected': self.ws_connected
        }

# Convenience functions for Discord bot integration

async def create_ai_client(
    gateway_url: str = "http://localhost:3002",
    api_key: Optional[str] = None,
    jwt_token: Optional[str] = None
) -> AIGatewayClient:
    """Create and initialize AI Gateway client"""
    client = AIGatewayClient(
        gateway_url=gateway_url,
        api_key=api_key,
        jwt_token=jwt_token
    )
    await client.initialize()
    return client

async def quick_ai_response(
    content: str,
    model: str = "opure-core",
    user_id: Optional[str] = None,
    client: Optional[AIGatewayClient] = None
) -> str:
    """Quick AI response generation for simple use cases"""
    if client is None:
        async with create_ai_client() as temp_client:
            return await quick_ai_response(content, model, user_id, temp_client)
    
    request = AIRequest(
        model=model,
        messages=[AIMessage(role="user", content=content)],
        metadata={'user_id': user_id} if user_id else None
    )
    
    response = await client.generate_ai_response(request)
    
    if response.success:
        return response.content or "No response generated"
    else:
        raise AIGatewayError(response.error or "Unknown error")

async def evaluate_content_quality(
    content: str,
    content_type: ContentType,
    user_id: Optional[str] = None,
    client: Optional[AIGatewayClient] = None
) -> TokenResult:
    """Evaluate content quality for token rewards"""
    if client is None:
        async with create_ai_client() as temp_client:
            return await evaluate_content_quality(content, content_type, user_id, temp_client)
    
    evaluation = TokenEvaluation(
        content=content,
        content_type=content_type,
        metadata={'user_id': user_id} if user_id else None
    )
    
    return await client.evaluate_content_for_tokens(evaluation)

# Context manager for automatic client management
@asynccontextmanager
async def ai_gateway_client(*args, **kwargs):
    """Context manager for AI Gateway client"""
    client = AIGatewayClient(*args, **kwargs)
    try:
        await client.initialize()
        yield client
    finally:
        await client.close()