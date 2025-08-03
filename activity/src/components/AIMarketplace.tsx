/**
 * AIMarketplace Component
 * AI-powered marketplace with intelligent pricing and fraud detection
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Input,
  Select,
  Badge,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormHelperText,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Progress,
  Tooltip,
  IconButton,
  Flex,
  Spacer,
  Divider,
  Tag,
  TagLabel,
  Image,
  AspectRatio
} from '@chakra-ui/react';
import {
  FiShoppingBag,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiEye,
  FiShield,
  FiStar,
  FiPlus,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiFilter,
  FiSearch
} from 'react-icons/fi';

// Types
interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  seller: {
    id: string;
    username: string;
    rating: number;
    trustScore: number;
  };
  images: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  views: number;
  likes: number;
  aiAnalysis?: {
    priceRecommendation: {
      suggested: number;
      confidence: number;
      reasoning: string[];
    };
    fraudScore: number;
    qualityScore: number;
    marketTrend: 'rising' | 'falling' | 'stable';
    demandForecast: number;
  };
}

interface PriceAnalysis {
  currentPrice: number;
  suggestedPrice: number;
  confidence: number;
  marketTrend: 'rising' | 'falling' | 'stable';
  competitiveItems: Array<{
    id: string;
    name: string;
    price: number;
    similarity: number;
  }>;
  priceHistory: Array<{
    date: Date;
    price: number;
    volume: number;
  }>;
  reasoning: string[];
}

interface ContentEvaluation {
  approved: boolean;
  qualityScore: number;
  fraudScore: number;
  improvements: string[];
  warnings: string[];
}

// Mock data for development
const mockItems: MarketplaceItem[] = [
  {
    id: '1',
    name: 'Legendary Dragon Sword',
    description: 'A powerful sword forged by ancient dragons with incredible stats and beautiful animations.',
    price: 150,
    category: 'weapons',
    rarity: 'legendary',
    seller: {
      id: 'user1',
      username: 'DragonMaster',
      rating: 4.8,
      trustScore: 95
    },
    images: ['/api/placeholder/300/200'],
    tags: ['dragon', 'sword', 'legendary', 'pvp'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    views: 1250,
    likes: 89,
    aiAnalysis: {
      priceRecommendation: {
        suggested: 145,
        confidence: 87,
        reasoning: [
          'Similar legendary weapons sell for 130-160 fragments',
          'High demand for dragon-themed items',
          'Seller has excellent reputation'
        ]
      },
      fraudScore: 0.15,
      qualityScore: 0.92,
      marketTrend: 'rising',
      demandForecast: 85
    }
  }
];

// AI-powered marketplace component
export const AIMarketplace: React.FC = () => {
  const [items, setItems] = useState<MarketplaceItem[]>(mockItems);
  const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>(mockItems);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [isLoading, setIsLoading] = useState(false);
  
  // New item creation
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'weapons',
    rarity: 'common' as const,
    tags: [] as string[],
    images: [] as string[]
  });
  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null);
  const [contentEvaluation, setContentEvaluation] = useState<ContentEvaluation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isAnalysisOpen, onOpen: onAnalysisOpen, onClose: onAnalysisClose } = useDisclosure();
  const toast = useToast();

  // Categories and rarities
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'weapons', label: 'Weapons' },
    { value: 'armor', label: 'Armor' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'consumables', label: 'Consumables' },
    { value: 'materials', label: 'Materials' },
    { value: 'cosmetics', label: 'Cosmetics' }
  ];

  const rarities = [
    { value: 'common', label: 'Common', color: 'gray' },
    { value: 'uncommon', label: 'Uncommon', color: 'green' },
    { value: 'rare', label: 'Rare', color: 'blue' },
    { value: 'epic', label: 'Epic', color: 'purple' },
    { value: 'legendary', label: 'Legendary', color: 'orange' }
  ];

  // Filter and search items
  useEffect(() => {
    let filtered = items;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Price range filter
    filtered = filtered.filter(item =>
      item.price >= priceRange[0] && item.price <= priceRange[1]
    );

    // Sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        filtered.sort((a, b) => b.views - a.views);
        break;
      case 'rating':
        filtered.sort((a, b) => b.seller.rating - a.seller.rating);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }

    setFilteredItems(filtered);
  }, [items, selectedCategory, searchQuery, priceRange, sortBy]);

  // Analyze item pricing with AI
  const analyzePricing = useCallback(async (itemData: Partial<MarketplaceItem>) => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const analysis: PriceAnalysis = {
        currentPrice: itemData.price || 0,
        suggestedPrice: Math.round((itemData.price || 0) * (0.85 + Math.random() * 0.3)),
        confidence: 75 + Math.random() * 20,
        marketTrend: ['rising', 'falling', 'stable'][Math.floor(Math.random() * 3)] as any,
        competitiveItems: [
          {
            id: 'comp1',
            name: 'Similar Item 1',
            price: (itemData.price || 0) * 0.9,
            similarity: 85
          },
          {
            id: 'comp2', 
            name: 'Similar Item 2',
            price: (itemData.price || 0) * 1.1,
            similarity: 78
          }
        ],
        priceHistory: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          price: (itemData.price || 0) * (0.9 + Math.random() * 0.2),
          volume: Math.floor(Math.random() * 50) + 10
        })),
        reasoning: [
          'Market demand for this category is currently high',
          'Similar items have sold well in the past week',
          'Your seller rating supports premium pricing'
        ]
      };
      
      setPriceAnalysis(analysis);
      onAnalysisOpen();
      
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze pricing. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast, onAnalysisOpen]);

  // Evaluate content quality
  const evaluateContent = useCallback(async (content: string, description: string) => {
    setIsAnalyzing(true);

    try {
      // Simulate AI evaluation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const qualityScore = 0.6 + Math.random() * 0.35;
      const fraudScore = Math.random() * 0.3;
      
      const evaluation: ContentEvaluation = {
        approved: qualityScore > 0.7 && fraudScore < 0.5,
        qualityScore,
        fraudScore,
        improvements: [
          'Add more detailed description',
          'Include better quality images',
          'Add relevant tags for better visibility'
        ].filter(() => Math.random() > 0.5),
        warnings: fraudScore > 0.3 ? [
          'Content may be flagged for manual review',
          'Ensure all information is accurate'
        ] : []
      };
      
      setContentEvaluation(evaluation);
      
      if (!evaluation.approved) {
        toast({
          title: 'Content Review Required',
          description: 'Your item needs improvements before listing',
          status: 'warning',
          duration: 5000,
          isClosable: true
        });
      }
      
    } catch (error) {
      toast({
        title: 'Evaluation Failed',
        description: 'Failed to evaluate content. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  // Create new item
  const createItem = useCallback(async () => {
    if (!newItem.name || !newItem.description || newItem.price <= 0) {
      toast({
        title: 'Invalid Item',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setIsLoading(true);

    try {
      // First evaluate content
      await evaluateContent(newItem.name, newItem.description);
      
      // If approved, create the item
      if (contentEvaluation?.approved) {
        const item: MarketplaceItem = {
          id: Date.now().toString(),
          ...newItem,
          seller: {
            id: 'currentUser',
            username: 'You',
            rating: 4.5,
            trustScore: 80
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          views: 0,
          likes: 0
        };
        
        setItems(prev => [item, ...prev]);
        onCreateClose();
        
        // Reset form
        setNewItem({
          name: '',
          description: '',
          price: 0,
          category: 'weapons',
          rarity: 'common',
          tags: [],
          images: []
        });
        
        toast({
          title: 'Item Created',
          description: 'Your item has been listed successfully',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
      
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create item. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [newItem, contentEvaluation, evaluateContent, onCreateClose, toast]);

  // Get rarity color
  const getRarityColor = (rarity: string) => {
    const rarityObj = rarities.find(r => r.value === rarity);
    return rarityObj?.color || 'gray';
  };

  return (
    <Box w="full" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex align="center" justify="space-between">
          <HStack>
            <FiShoppingBag size={24} />
            <Heading size="lg">AI-Powered Marketplace</Heading>
            <Badge colorScheme="blue">Beta</Badge>
          </HStack>
          
          <Button
            colorScheme="blue"
            leftIcon={<FiPlus />}
            onClick={onCreateOpen}
          >
            List Item
          </Button>
        </Flex>

        {/* Filters and Search */}
        <Card>
          <CardBody>
            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              <GridItem>
                <FormControl>
                  <FormLabel>Search</FormLabel>
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftElement={<FiSearch />}
                  />
                </FormControl>
              </GridItem>
              
              <GridItem>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </GridItem>
              
              <GridItem>
                <FormControl>
                  <FormLabel>Sort By</FormLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                  </Select>
                </FormControl>
              </GridItem>
            </Grid>
          </CardBody>
        </Card>

        {/* Items Grid */}
        <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
          {filteredItems.map((item) => (
            <Card key={item.id} cursor="pointer" _hover={{ shadow: 'lg' }}>
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  {/* Item Image */}
                  <AspectRatio ratio={16/9}>
                    <Image
                      src={item.images[0] || '/api/placeholder/300/200'}
                      alt={item.name}
                      borderRadius="md"
                      objectFit="cover"
                    />
                  </AspectRatio>
                  
                  {/* Item Info */}
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Badge colorScheme={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                      <HStack>
                        <FiEye size={12} />
                        <Text fontSize="xs">{item.views}</Text>
                      </HStack>
                    </HStack>
                    
                    <Heading size="sm" noOfLines={2}>
                      {item.name}
                    </Heading>
                    
                    <Text fontSize="sm" color="gray.600" noOfLines={3}>
                      {item.description}
                    </Text>
                    
                    {/* Tags */}
                    <HStack wrap="wrap" spacing={1}>
                      {item.tags.slice(0, 3).map((tag) => (
                        <Tag key={tag} size="sm" variant="subtle">
                          <TagLabel>{tag}</TagLabel>
                        </Tag>
                      ))}
                      {item.tags.length > 3 && (
                        <Text fontSize="xs" color="gray.500">
                          +{item.tags.length - 3} more
                        </Text>
                      )}
                    </HStack>
                    
                    {/* Price and AI Analysis */}
                    <HStack justify="space-between" align="center">
                      <VStack align="start" spacing={0}>
                        <HStack>
                          <FiDollarSign />
                          <Text fontWeight="bold" fontSize="lg">
                            {item.price}
                          </Text>
                        </HStack>
                        
                        {item.aiAnalysis && (
                          <HStack spacing={1}>
                            {item.aiAnalysis.marketTrend === 'rising' && (
                              <FiTrendingUp color="green" size={12} />
                            )}
                            {item.aiAnalysis.marketTrend === 'falling' && (
                              <FiTrendingDown color="red" size={12} />
                            )}
                            <Text fontSize="xs" color="gray.500">
                              AI: {item.aiAnalysis.priceRecommendation.suggested} 
                              ({item.aiAnalysis.priceRecommendation.confidence}% confidence)
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                      
                      <VStack align="end" spacing={1}>
                        <HStack>
                          <FiStar color="gold" size={12} />
                          <Text fontSize="xs">{item.seller.rating}</Text>
                        </HStack>
                        
                        {item.aiAnalysis && (
                          <HStack spacing={1}>
                            <FiShield 
                              color={item.aiAnalysis.fraudScore < 0.3 ? 'green' : 'orange'} 
                              size={12} 
                            />
                            <Text fontSize="xs" color="gray.500">
                              Trust: {((1 - item.aiAnalysis.fraudScore) * 100).toFixed(0)}%
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    </HStack>
                    
                    <Button size="sm" colorScheme="blue" variant="outline">
                      View Details
                    </Button>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </Grid>

        {/* No items found */}
        {filteredItems.length === 0 && (
          <Card>
            <CardBody textAlign="center" py={12}>
              <VStack spacing={4}>
                <FiShoppingBag size={48} color="gray" />
                <Text color="gray.500" fontSize="lg">
                  No items found matching your criteria
                </Text>
                <Button onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setPriceRange([0, 1000]);
                }}>
                  Clear Filters
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>

      {/* Create Item Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>List New Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Item Name</FormLabel>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter item name..."
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your item..."
                  rows={4}
                />
              </FormControl>
              
              <HStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Price</FormLabel>
                  <NumberInput
                    value={newItem.price}
                    onChange={(value) => setNewItem(prev => ({ ...prev, price: parseInt(value) || 0 }))}
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <FormHelperText>
                    <Button
                      size="xs"
                      variant="link"
                      onClick={() => analyzePricing(newItem)}
                      isLoading={isAnalyzing}
                    >
                      AI Price Analysis
                    </Button>
                  </FormHelperText>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.slice(1).map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Rarity</FormLabel>
                  <Select
                    value={newItem.rarity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, rarity: e.target.value as any }))}
                  >
                    {rarities.map(rarity => (
                      <option key={rarity.value} value={rarity.value}>
                        {rarity.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>
              
              {/* Content Evaluation Results */}
              {contentEvaluation && (
                <Alert status={contentEvaluation.approved ? 'success' : 'warning'}>
                  <AlertIcon />
                  <VStack align="start" spacing={2}>
                    <Text fontWeight="bold">
                      {contentEvaluation.approved ? 'Ready to List' : 'Needs Improvement'}
                    </Text>
                    <Text fontSize="sm">
                      Quality Score: {(contentEvaluation.qualityScore * 100).toFixed(0)}% | 
                      Fraud Risk: {(contentEvaluation.fraudScore * 100).toFixed(0)}%
                    </Text>
                    {contentEvaluation.improvements.length > 0 && (
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="bold">Suggestions:</Text>
                        {contentEvaluation.improvements.map((improvement, index) => (
                          <Text key={index} fontSize="sm">• {improvement}</Text>
                        ))}
                      </VStack>
                    )}
                  </VStack>
                </Alert>
              )}
              
              <Button
                onClick={() => evaluateContent(newItem.name, newItem.description)}
                isLoading={isAnalyzing}
                leftIcon={<FiShield />}
                variant="outline"
              >
                Evaluate Content Quality
              </Button>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={createItem}
              isLoading={isLoading}
              isDisabled={!contentEvaluation?.approved}
            >
              List Item
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Price Analysis Modal */}
      <Modal isOpen={isAnalysisOpen} onClose={onAnalysisClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>AI Price Analysis</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {priceAnalysis && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Stat>
                    <StatLabel>Current Price</StatLabel>
                    <StatNumber>{priceAnalysis.currentPrice}</StatNumber>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Suggested Price</StatLabel>
                    <StatNumber color="blue.500">{priceAnalysis.suggestedPrice}</StatNumber>
                    <StatHelpText>
                      {priceAnalysis.confidence.toFixed(0)}% confidence
                    </StatHelpText>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Market Trend</StatLabel>
                    <StatNumber>
                      <HStack>
                        {priceAnalysis.marketTrend === 'rising' && <StatArrow type="increase" />}
                        {priceAnalysis.marketTrend === 'falling' && <StatArrow type="decrease" />}
                        <Text textTransform="capitalize">{priceAnalysis.marketTrend}</Text>
                      </HStack>
                    </StatNumber>
                  </Stat>
                </HStack>
                
                <Divider />
                
                <Box>
                  <Text fontWeight="bold" mb={2}>AI Reasoning:</Text>
                  <VStack align="start" spacing={1}>
                    {priceAnalysis.reasoning.map((reason, index) => (
                      <Text key={index} fontSize="sm">• {reason}</Text>
                    ))}
                  </VStack>
                </Box>
                
                <Box>
                  <Text fontWeight="bold" mb={2}>Similar Items:</Text>
                  <VStack spacing={2}>
                    {priceAnalysis.competitiveItems.map((item) => (
                      <HStack key={item.id} w="full" justify="space-between" p={2} bg="gray.50" borderRadius="md">
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="medium">{item.name}</Text>
                          <Text fontSize="xs" color="gray.600">{item.similarity}% similar</Text>
                        </VStack>
                        <Text fontWeight="bold">{item.price}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
                
                <Button
                  colorScheme="blue"
                  onClick={() => {
                    setNewItem(prev => ({ ...prev, price: priceAnalysis.suggestedPrice }));
                    onAnalysisClose();
                  }}
                >
                  Use Suggested Price
                </Button>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AIMarketplace;