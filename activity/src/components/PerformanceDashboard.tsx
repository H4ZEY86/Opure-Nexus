/**
 * Performance Dashboard Component
 * Real-time monitoring of AI system performance and gaming compatibility
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Button,
  IconButton,
  Tooltip,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Divider,
  useColorModeValue,
  useToast,
  Flex,
  Spacer,
  SimpleGrid,
  List,
  ListItem,
  ListIcon,
  Chart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart
} from '@chakra-ui/react';
import {
  FiCpu,
  FiHardDrive,
  FiZap,
  FiThermometer,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw,
  FiSettings,
  FiGamepad2,
  FiMonitor,
  FiWifi,
  FiClock,
  FiBarChart3
} from 'react-icons/fi';
import { io, Socket } from 'socket.io-client';

// Types
interface SystemMetrics {
  timestamp: string;
  gpu: {
    utilization: number;
    memory: {
      used: number;
      total: number;
      utilization: number;
    };
    temperature: number;
    powerDraw: number;
    clockSpeed: number;
  };
  system: {
    cpu: {
      utilization: number;
      cores: number[];
      temperature: number;
    };
    memory: {
      used: number;
      total: number;
      utilization: number;
      available: number;
    };
    disk: {
      read: number;
      write: number;
      utilization: number;
    };
    network: {
      sent: number;
      received: number;
    };
  };
  ai: {
    loadedModels: string[];
    queueLength: number;
    activeRequests: number;
    resourceUsage: {
      utilizationPercent: number;
      estimatedVRAM: number;
      maxVRAM: number;
    };
    averageResponseTime: number;
    successRate: number;
    gamingMode: boolean;
  };
}

interface PerformanceAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface ModelPerformance {
  name: string;
  requests: number;
  averageTime: number;
  successRate: number;
  vramUsage: number;
  tier: 'premium' | 'standard' | 'basic';
}

// Custom hook for performance monitoring
const usePerformanceMonitoring = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [historicalData, setHistoricalData] = useState<SystemMetrics[]>([]);
  const toast = useToast();

  useEffect(() => {
    const gatewayUrl = process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:3002';
    const apiKey = process.env.REACT_APP_AI_GATEWAY_API_KEY;

    const newSocket = io(gatewayUrl, {
      auth: { apiKey },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('performance:subscribe', { 
        interval: 1000,
        metrics: ['gpu', 'system', 'ai']
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('performance:update', (data: SystemMetrics) => {
      setMetrics(data);
      setHistoricalData(prev => {
        const newData = [...prev, data].slice(-60); // Keep last 60 data points
        return newData;
      });
    });

    newSocket.on('system:alert', (alert: Omit<PerformanceAlert, 'id' | 'acknowledged'>) => {
      const newAlert: PerformanceAlert = {
        ...alert,
        id: Date.now().toString(),
        timestamp: new Date(),
        acknowledged: false
      };
      
      setAlerts(prev => [newAlert, ...prev.slice(0, 19)]); // Keep last 20 alerts
      
      // Show toast for critical alerts
      if (alert.severity === 'critical') {
        toast({
          title: 'Critical Alert',
          description: alert.message,
          status: 'error',
          duration: 10000,
          isClosable: true
        });
      }
    });

    newSocket.on('analytics:update', (data: any) => {
      if (data.metrics?.ai?.models) {
        setModelPerformance(data.metrics.ai.models);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [toast]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
  };

  const toggleGamingMode = async () => {
    if (socket && connected) {
      const newMode = !metrics?.ai.gamingMode;
      socket.emit('gaming-mode:toggle', { enabled: newMode });
      
      toast({
        title: `Gaming Mode ${newMode ? 'Enabled' : 'Disabled'}`,
        description: newMode 
          ? 'AI resources reduced for optimal gaming performance'
          : 'Full AI performance restored',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return {
    socket,
    connected,
    metrics,
    alerts,
    modelPerformance,
    historicalData,
    acknowledgeAlert,
    toggleGamingMode
  };
};

// Performance Dashboard Component
export const PerformanceDashboard: React.FC = () => {
  const {
    connected,
    metrics,
    alerts,
    modelPerformance,
    historicalData,
    acknowledgeAlert,
    toggleGamingMode
  } = usePerformanceMonitoring();

  const [refreshInterval, setRefreshInterval] = useState('1000');
  const [selectedTimeRange, setSelectedTimeRange] = useState('1m');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Helper functions
  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'red';
    if (value >= thresholds.warning) return 'yellow';
    return 'green';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTemp = (temp: number) => `${temp.toFixed(1)}°C`;

  // Render GPU metrics
  const renderGPUMetrics = () => {
    if (!metrics?.gpu) return null;

    const { gpu } = metrics;
    const vramUsage = (gpu.memory.used / gpu.memory.total) * 100;

    return (
      <Card>
        <CardHeader>
          <HStack>
            <FiMonitor />
            <Heading size="md">GPU Performance</Heading>
            <Badge colorScheme={gpu.utilization > 85 ? 'red' : 'green'}>
              RTX 5070 Ti
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel>GPU Utilization</StatLabel>
              <HStack>
                <CircularProgress
                  value={gpu.utilization}
                  color={getStatusColor(gpu.utilization, { warning: 75, critical: 90 })}
                  size="60px"
                >
                  <CircularProgressLabel>
                    {gpu.utilization.toFixed(0)}%
                  </CircularProgressLabel>
                </CircularProgress>
                <VStack align="start" spacing={0}>
                  <StatNumber>{gpu.utilization.toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    Clock: {gpu.clockSpeed}MHz
                  </StatHelpText>
                </VStack>
              </HStack>
            </Stat>

            <Stat>
              <StatLabel>VRAM Usage</StatLabel>
              <StatNumber>{formatBytes(gpu.memory.used)}</StatNumber>
              <StatHelpText>
                of {formatBytes(gpu.memory.total)} ({vramUsage.toFixed(1)}%)
              </StatHelpText>
              <Progress
                value={vramUsage}
                colorScheme={getStatusColor(vramUsage, { warning: 80, critical: 95 })}
                size="sm"
                mt={2}
              />
            </Stat>

            <Stat>
              <StatLabel>Temperature</StatLabel>
              <HStack>
                <FiThermometer />
                <StatNumber color={getStatusColor(gpu.temperature, { warning: 75, critical: 85 })}>
                  {formatTemp(gpu.temperature)}
                </StatNumber>
              </HStack>
              <StatHelpText>
                Power: {gpu.powerDraw}W
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Gaming Impact</StatLabel>
              <StatNumber>
                {metrics?.ai.gamingMode ? 'Minimal' : 'Moderate'}
              </StatNumber>
              <StatHelpText>
                {metrics?.ai.gamingMode ? 'Gaming mode active' : 'Full AI performance'}
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>
    );
  };

  // Render System metrics
  const renderSystemMetrics = () => {
    if (!metrics?.system) return null;

    const { system } = metrics;

    return (
      <Card>
        <CardHeader>
          <HStack>
            <FiCpu />
            <Heading size="md">System Performance</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel>CPU Usage</StatLabel>
              <HStack>
                <CircularProgress
                  value={system.cpu.utilization}
                  color={getStatusColor(system.cpu.utilization, { warning: 80, critical: 95 })}
                  size="60px"
                >
                  <CircularProgressLabel>
                    {system.cpu.utilization.toFixed(0)}%
                  </CircularProgressLabel>
                </CircularProgress>
                <VStack align="start" spacing={0}>
                  <StatNumber>{system.cpu.utilization.toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    Temp: {formatTemp(system.cpu.temperature)}
                  </StatHelpText>
                </VStack>
              </HStack>
            </Stat>

            <Stat>
              <StatLabel>Memory Usage</StatLabel>
              <StatNumber>{formatBytes(system.memory.used)}</StatNumber>
              <StatHelpText>
                of {formatBytes(system.memory.total)} ({system.memory.utilization.toFixed(1)}%)
              </StatHelpText>
              <Progress
                value={system.memory.utilization}
                colorScheme={getStatusColor(system.memory.utilization, { warning: 85, critical: 95 })}
                size="sm"
                mt={2}
              />
            </Stat>

            <Stat>
              <StatLabel>Disk I/O</StatLabel>
              <StatNumber>{system.disk.utilization.toFixed(1)}%</StatNumber>
              <StatHelpText>
                R: {formatBytes(system.disk.read)}/s W: {formatBytes(system.disk.write)}/s
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Network</StatLabel>
              <StatNumber>{formatBytes(system.network.received)}/s</StatNumber>
              <StatHelpText>
                ↓ {formatBytes(system.network.received)}/s ↑ {formatBytes(system.network.sent)}/s
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>
    );
  };

  // Render AI metrics
  const renderAIMetrics = () => {
    if (!metrics?.ai) return null;

    const { ai } = metrics;
    const vramUsagePercent = ai.resourceUsage.utilizationPercent;

    return (
      <Card>
        <CardHeader>
          <HStack>
            <FiZap />
            <Heading size="md">AI Performance</Heading>
            <Badge colorScheme={ai.gamingMode ? 'orange' : 'blue'}>
              {ai.gamingMode ? 'Gaming Mode' : 'Full Performance'}
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel>Loaded Models</StatLabel>
              <StatNumber>{ai.loadedModels.length}</StatNumber>
              <StatHelpText>
                Queue: {ai.queueLength} | Active: {ai.activeRequests}
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Response Time</StatLabel>
              <StatNumber>{ai.averageResponseTime.toFixed(0)}ms</StatNumber>
              <StatHelpText>
                Success Rate: {ai.successRate.toFixed(1)}%
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>AI VRAM Usage</StatLabel>
              <StatNumber>{(ai.resourceUsage.estimatedVRAM / 1024).toFixed(1)}GB</StatNumber>
              <StatHelpText>
                {vramUsagePercent.toFixed(1)}% of allocated
              </StatHelpText>
              <Progress
                value={vramUsagePercent}
                colorScheme={getStatusColor(vramUsagePercent, { warning: 80, critical: 95 })}
                size="sm"
                mt={2}
              />
            </Stat>

            <Stat>
              <StatLabel>Gaming Mode</StatLabel>
              <HStack>
                <Switch
                  isChecked={ai.gamingMode}
                  onChange={toggleGamingMode}
                  colorScheme="orange"
                />
                <Text fontSize="sm">
                  {ai.gamingMode ? 'Enabled' : 'Disabled'}
                </Text>
              </HStack>
              <StatHelpText>
                {ai.gamingMode 
                  ? 'AI resources reduced for gaming'
                  : 'Full AI performance active'
                }
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Model list */}
          {ai.loadedModels.length > 0 && (
            <Box mt={4}>
              <Text fontWeight="bold" mb={2}>Active Models:</Text>
              <HStack wrap="wrap" spacing={1}>
                {ai.loadedModels.map((model) => (
                  <Badge key={model} variant="outline" fontSize="xs">
                    {model}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}
        </CardBody>
      </Card>
    );
  };

  // Render alerts
  const renderAlerts = () => {
    const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
    
    if (unacknowledgedAlerts.length === 0) {
      return (
        <Card>
          <CardBody textAlign="center" py={8}>
            <VStack spacing={2}>
              <FiCheckCircle size={32} color="green" />
              <Text color="green.500" fontWeight="bold">
                All Systems Normal
              </Text>
              <Text fontSize="sm" color="gray.500">
                No active alerts or warnings
              </Text>
            </VStack>
          </CardBody>
        </Card>
      );
    }

    return (
      <VStack spacing={2} align="stretch">
        {unacknowledgedAlerts.slice(0, 5).map((alert) => (
          <Alert
            key={alert.id}
            status={alert.severity === 'critical' ? 'error' : 
                   alert.severity === 'warning' ? 'warning' : 'info'}
          >
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>{alert.component.toUpperCase()}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Box>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => acknowledgeAlert(alert.id)}
            >
              Dismiss
            </Button>
          </Alert>
        ))}
      </VStack>
    );
  };

  // Render performance chart
  const renderPerformanceChart = () => {
    if (historicalData.length < 2) return null;

    const chartData = historicalData.map((data, index) => ({
      time: index,
      gpu: data.gpu.utilization,
      cpu: data.system.cpu.utilization,
      memory: data.system.memory.utilization,
      vram: (data.gpu.memory.used / data.gpu.memory.total) * 100
    }));

    return (
      <Card>
        <CardHeader>
          <HStack>
            <FiBarChart3 />
            <Heading size="md">Performance Trends</Heading>
            <Spacer />
            <Select size="sm" value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)}>
              <option value="1m">Last Minute</option>
              <option value="5m">Last 5 Minutes</option>
              <option value="1h">Last Hour</option>
            </Select>
          </HStack>
        </CardHeader>
        <CardBody>
          <Box h="300px">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Area
                  type="monotone"
                  dataKey="gpu"
                  stackId="1"
                  stroke="#3182ce"
                  fill="#3182ce"
                  fillOpacity={0.6}
                  name="GPU"
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stackId="2" 
                  stroke="#38a169"
                  fill="#38a169"
                  fillOpacity={0.6}
                  name="CPU"
                />
                <Area
                  type="monotone"
                  dataKey="vram"
                  stackId="3"
                  stroke="#d69e2e"
                  fill="#d69e2e"
                  fillOpacity={0.6}
                  name="VRAM"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>
    );
  };

  // Render model performance
  const renderModelPerformance = () => {
    if (modelPerformance.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <HStack>
            <FiActivity />
            <Heading size="md">Model Performance</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={3} align="stretch">
            {modelPerformance.map((model) => (
              <Box key={model.name} p={3} border="1px solid" borderColor={borderColor} borderRadius="md">
                <HStack justify="space-between" mb={2}>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold">{model.name}</Text>
                    <Badge colorScheme={
                      model.tier === 'premium' ? 'purple' :
                      model.tier === 'standard' ? 'blue' : 'gray'
                    }>
                      {model.tier}
                    </Badge>
                  </VStack>
                  <VStack align="end" spacing={0}>
                    <Text fontWeight="bold">{model.averageTime.toFixed(0)}ms</Text>
                    <Text fontSize="sm" color="gray.500">avg response</Text>
                  </VStack>
                </HStack>
                
                <HStack justify="space-between" fontSize="sm">
                  <Text>Requests: {model.requests}</Text>
                  <Text>Success: {model.successRate.toFixed(1)}%</Text>
                  <Text>VRAM: {(model.vramUsage / 1024).toFixed(1)}GB</Text>
                </HStack>
                
                <Progress
                  value={model.successRate}
                  colorScheme={model.successRate > 95 ? 'green' : 'yellow'}
                  size="sm"
                  mt={2}
                />
              </Box>
            ))}
          </VStack>
        </CardBody>
      </Card>
    );
  };

  return (
    <Box w="full" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex align="center" justify="space-between">
          <HStack>
            <FiActivity size={24} />
            <Heading size="lg">Performance Dashboard</Heading>
            <Badge colorScheme={connected ? 'green' : 'red'}>
              {connected ? 'Live' : 'Disconnected'}
            </Badge>
          </HStack>
          
          <HStack>
            <Tooltip label="Advanced Settings">
              <IconButton
                aria-label="Advanced Settings"
                icon={<FiSettings />}
                size="sm"
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
              />
            </Tooltip>
            
            <Tooltip label="Refresh">
              <IconButton
                aria-label="Refresh"
                icon={<FiRefreshCw />}
                size="sm"
                variant="ghost"
              />
            </Tooltip>
          </HStack>
        </Flex>

        {/* System Status Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(400px, 1fr))" gap={6}>
          <GridItem>
            {renderGPUMetrics()}
          </GridItem>
          <GridItem>
            {renderSystemMetrics()}
          </GridItem>
          <GridItem>
            {renderAIMetrics()}
          </GridItem>
        </Grid>

        {/* Performance Chart */}
        {renderPerformanceChart()}

        {/* Alerts and Model Performance */}
        <Grid templateColumns="repeat(auto-fit, minmax(400px, 1fr))" gap={6}>
          <GridItem>
            <Card>
              <CardHeader>
                <HStack>
                  <FiAlertTriangle />
                  <Heading size="md">System Alerts</Heading>
                  <Badge colorScheme="red">{alerts.filter(a => !a.acknowledged).length}</Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                {renderAlerts()}
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            {renderModelPerformance()}
          </GridItem>
        </Grid>

        {/* Connection Status */}
        {!connected && (
          <Alert status="warning">
            <AlertIcon />
            <AlertTitle>Connection Lost</AlertTitle>
            <AlertDescription>
              Unable to connect to AI Gateway. Performance data may be outdated.
            </AlertDescription>
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default PerformanceDashboard;