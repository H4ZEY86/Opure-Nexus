/**
 * AIAssistant Component
 * Real-time AI integration for the Discord Activity
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Input, 
  Button, 
  Text, 
  Select, 
  Badge, 
  Progress, 
  Alert, 
  AlertIcon,
  Textarea,
  useToast,
  Spinner,
  Divider,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Switch,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  CircularProgress,
  CircularProgressLabel
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiMic, 
  FiSettings, 
  FiZap, 
  FiCpu, 
  FiActivity,
  FiAward,
  FiShield,
  FiTrendingUp,
  FiRefreshCw
} from 'react-icons/fi';
import { io, Socket } from 'socket.io-client';

// Types
interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  metrics?: {
    processingTime: number;
    totalTime: number;
  };
  streaming?: boolean;
}

interface ModelStatus {
  name: string;
  isLoaded: boolean;
  isBusy: boolean;
  responseTimeAvg: number;
  requestCount: number;
  tier: 'premium' | 'standard' | 'basic';
}

interface PerformanceMetrics {
  gpu: {
    utilization: number;
    memory: number;
    temperature: number;
  };
  system: {
    memory: {
      utilization: number;
      used: number;
      total: number;
    };
    cpu: {
      utilization: number;
    };
  };
  ai: {
    loadedModels: string[];
    queueLength: number;
    resourceUsage: {
      utilizationPercent: number;
      estimatedVRAM: number;
      maxVRAM: number;
    };
  };
}

interface TokenEvaluation {
  approved: boolean;
  amount: number;
  quality: {
    overall: number;
    complexity: number;
    originality: number;
    engagement: number;
    grammar: number;
    toxicity: number;
  };
  fraud: {
    score: number;
    recommendation: string;
    confidence: number;
    factors: string[];
  };
}

// AI Gateway Client Hook
const useAIGateway = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [models, setModels] = useState<Record<string, ModelStatus>>({});
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const toast = useToast();

  useEffect(() => {
    const gatewayUrl = process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:3002';
    const apiKey = process.env.REACT_APP_AI_GATEWAY_API_KEY;

    const newSocket = io(gatewayUrl, {
      auth: {
        apiKey: apiKey
      },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      setConnected(true);
      toast({
        title: 'AI Assistant Connected',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      toast({
        title: 'AI Assistant Disconnected',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
    });

    newSocket.on('performance:update', (data: PerformanceMetrics) => {
      setPerformance(data);
    });

    newSocket.on('system:alert', (alert) => {
      toast({
        title: `System Alert: ${alert.component}`,
        description: alert.message,
        status: alert.severity === 'critical' ? 'error' : 
               alert.severity === 'warning' ? 'warning' : 'info',
        duration: 5000,
        isClosable: true
      });
    });

    newSocket.on('error', (error) => {
      toast({
        title: 'AI Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [toast]);

  // Subscribe to performance updates
  useEffect(() => {
    if (socket && connected) {
      socket.emit('performance:subscribe');
      socket.emit('analytics:subscribe');

      return () => {
        socket.emit('performance:unsubscribe');
        socket.emit('analytics:unsubscribe');
      };
    }
  }, [socket, connected]);

  return { socket, connected, models, performance };
};

// Main AI Assistant Component
export const AIAssistant: React.FC = () => {
  const { socket, connected, performance } = useAIGateway();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('opure-core');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<AIMessage | null>(null);
  const [autoEvaluate, setAutoEvaluate] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const toast = useToast();

  // Available AI models
  const availableModels = [
    { value: 'opure-core', label: 'Opure Core', description: 'General purpose AI' },
    { value: 'opure-music', label: 'Opure Music', description: 'Music and audio expert' },
    { value: 'opure-adventure', label: 'Opure Adventure', description: 'Gaming and adventure AI' },
    { value: 'opure-social', label: 'Opure Social', description: 'Social interaction specialist' },
    { value: 'opure-economy', label: 'Opure Economy', description: 'Economy and trading AI' }
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Send message to AI
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !socket || !connected || isGenerating) {
      return;
    }

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);

    try {
      // Emit AI generation request
      socket.emit('ai:generate', {
        model: selectedModel,
        messages: [{ role: 'user', content: inputMessage }],
        options: {
          temperature: 0.7,
          max_tokens: 1000
        },
        conversationId: `activity_${Date.now()}`
      });

      // Listen for response
      socket.once('ai:response', (response) => {
        setIsGenerating(false);
        
        if (response.success) {
          const aiMessage: AIMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
            model: selectedModel,
            metrics: response.metrics
          };
          
          setMessages(prev => [...prev, aiMessage]);
          
          // Auto-evaluate if enabled
          if (autoEvaluate) {
            evaluateContent(response.content);
          }
        } else {
          toast({
            title: 'AI Generation Failed',
            description: response.error,
            status: 'error',
            duration: 5000,
            isClosable: true
          });
        }
      });

    } catch (error) {
      setIsGenerating(false);
      toast({
        title: 'Error',
        description: 'Failed to send message to AI',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [inputMessage, socket, connected, isGenerating, selectedModel, autoEvaluate, toast]);

  // Stream AI response
  const streamMessage = useCallback(async () => {
    if (!inputMessage.trim() || !socket || !connected || isGenerating) {
      return;
    }

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);

    // Initialize streaming message
    const streamingMsg: AIMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      streaming: true
    };
    
    setStreamingMessage(streamingMsg);

    try {
      socket.emit('ai:stream', {
        model: selectedModel,
        messages: [{ role: 'user', content: inputMessage }],
        options: { temperature: 0.7 }
      });

      // Listen for streaming chunks
      socket.on('ai:stream:chunk', (data) => {
        setStreamingMessage(prev => prev ? {
          ...prev,
          content: prev.content + data.content
        } : null);
      });

      // Listen for completion
      socket.once('ai:stream:complete', (data) => {
        setIsGenerating(false);
        
        if (streamingMessage) {
          const finalMessage: AIMessage = {
            ...streamingMessage,
            streaming: false,
            metrics: {
              processingTime: data.totalTime,
              totalTime: data.totalTime
            }
          };
          
          setMessages(prev => [...prev, finalMessage]);
          setStreamingMessage(null);
        }
      });

      // Listen for errors
      socket.once('ai:stream:error', (error) => {
        setIsGenerating(false);
        setStreamingMessage(null);
        
        toast({
          title: 'Streaming Failed',
          description: error.error,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      });

    } catch (error) {
      setIsGenerating(false);
      setStreamingMessage(null);
      toast({
        title: 'Error',
        description: 'Failed to start streaming',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [inputMessage, socket, connected, isGenerating, selectedModel, streamingMessage, toast]);

  // Evaluate content for tokens
  const evaluateContent = useCallback(async (content: string) => {
    if (!socket || !connected) return;

    try {
      socket.emit('tokens:evaluate', {
        content,
        contentType: 'message',
        metadata: {
          source: 'ai_assistant',
          auto_evaluation: true
        }
      });

      socket.once('tokens:result', (result: TokenEvaluation) => {
        if (result.approved && result.amount > 0) {
          toast({
            title: 'Tokens Earned!',
            description: `You earned ${result.amount} tokens for quality content`,
            status: 'success',
            duration: 3000,
            isClosable: true
          });
        }
      });

    } catch (error) {
      console.error('Token evaluation error:', error);
    }
  }, [socket, connected, toast]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box w="full" h="full" p={4}>
      <VStack spacing={4} h="full">
        {/* Header */}
        <HStack w="full" justify="space-between">
          <HStack>
            <FiZap />
            <Heading size="md">AI Assistant</Heading>
            <Badge colorScheme={connected ? 'green' : 'red'}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </HStack>
          
          <HStack>
            <Tooltip label="Settings">
              <IconButton
                aria-label="Settings"
                icon={<FiSettings />}
                size="sm"
                variant="ghost"
                onClick={onSettingsOpen}
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Performance Monitor */}
        {performance && (
          <Card w="full" size="sm">
            <CardBody>
              <HStack spacing={8}>
                <Stat size="sm">
                  <StatLabel>GPU Usage</StatLabel>
                  <HStack>
                    <CircularProgress 
                      value={performance.gpu.utilization} 
                      size="40px"
                      color={performance.gpu.utilization > 85 ? 'red.400' : 'green.400'}
                    >
                      <CircularProgressLabel fontSize="xs">
                        {performance.gpu.utilization.toFixed(0)}%
                      </CircularProgressLabel>
                    </CircularProgress>
                    <Text fontSize="sm">{performance.gpu.utilization.toFixed(1)}%</Text>
                  </HStack>
                </Stat>

                <Stat size="sm">
                  <StatLabel>AI Models</StatLabel>
                  <StatNumber>{performance.ai.loadedModels.length}</StatNumber>
                  <StatHelpText>Queue: {performance.ai.queueLength}</StatHelpText>
                </Stat>

                <Stat size="sm">
                  <StatLabel>VRAM Usage</StatLabel>
                  <StatNumber>
                    {(performance.ai.resourceUsage.estimatedVRAM / 1024).toFixed(1)}GB
                  </StatNumber>
                  <StatHelpText>
                    {performance.ai.resourceUsage.utilizationPercent.toFixed(0)}% used
                  </StatHelpText>
                </Stat>
              </HStack>
            </CardBody>
          </Card>
        )}

        {/* Messages Container */}
        <Box 
          flex={1} 
          w="full" 
          overflowY="auto" 
          border="1px solid" 
          borderColor="gray.200" 
          borderRadius="md" 
          p={4}
        >
          <VStack spacing={4} align="stretch">
            {messages.map((message) => (
              <Box
                key={message.id}
                alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="80%"
              >
                <Box
                  bg={message.role === 'user' ? 'blue.500' : 'gray.100'}
                  color={message.role === 'user' ? 'white' : 'black'}
                  p={3}
                  borderRadius="lg"
                  borderBottomRightRadius={message.role === 'user' ? 'sm' : 'lg'}
                  borderBottomLeftRadius={message.role === 'user' ? 'lg' : 'sm'}
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {message.content}
                  </Text>
                  
                  {message.metrics && (
                    <Text fontSize="xs" opacity={0.7} mt={1}>
                      {message.model} • {message.metrics.processingTime}ms
                    </Text>
                  )}
                </Box>
                
                <Text fontSize="xs" opacity={0.5} mt={1}>
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </Box>
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <Box alignSelf="flex-start" maxW="80%">
                <Box
                  bg="gray.100"
                  p={3}
                  borderRadius="lg"
                  borderBottomLeftRadius="sm"
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {streamingMessage.content}
                    {isGenerating && <Spinner size="xs" ml={2} />}
                  </Text>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </VStack>
        </Box>

        {/* Input Area */}
        <VStack w="full" spacing={2}>
          <HStack w="full">
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              size="sm"
              maxW="200px"
            >
              {availableModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </Select>
          </HStack>
          
          <HStack w="full">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              size="sm"
              resize="none"
              rows={2}
              disabled={!connected || isGenerating}
            />
            
            <VStack>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={sendMessage}
                disabled={!connected || isGenerating || !inputMessage.trim()}
                leftIcon={<FiSend />}
              >
                Send
              </Button>
              
              <Button
                colorScheme="purple"
                size="sm"
                onClick={streamMessage}
                disabled={!connected || isGenerating || !inputMessage.trim()}
                leftIcon={<FiActivity />}
              >
                Stream
              </Button>
            </VStack>
          </HStack>
        </VStack>
      </VStack>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>AI Assistant Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="auto-evaluate" mb="0">
                  Auto-evaluate content for tokens
                </FormLabel>
                <Switch
                  id="auto-evaluate"
                  isChecked={autoEvaluate}
                  onChange={(e) => setAutoEvaluate(e.target.checked)}
                />
              </FormControl>

              <Divider />

              <Box w="full">
                <Text fontWeight="bold" mb={2}>Available Models:</Text>
                <VStack align="stretch" spacing={2}>
                  {availableModels.map((model) => (
                    <Box key={model.value} p={2} border="1px solid" borderColor="gray.200" borderRadius="md">
                      <HStack justify="space-between">
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">{model.label}</Text>
                          <Text fontSize="sm" color="gray.600">{model.description}</Text>
                        </VStack>
                        <Badge colorScheme={selectedModel === model.value ? 'blue' : 'gray'}>
                          {selectedModel === model.value ? 'Selected' : 'Available'}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AIAssistant;