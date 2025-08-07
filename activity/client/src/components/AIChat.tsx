import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContext'
import { getAIResponse } from '../data/mockData'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  personality?: 'scottish' | 'gaming' | 'music'
}

interface AIChatProps {
  className?: string
}

export const AIChat: React.FC<AIChatProps> = ({ className = '' }) => {
  const { user } = useDiscord()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: `Aye there ${user?.username || 'mate'}! 🏴󠁧󠁢󠁳󠁣󠁴󠁿 I'm your Scottish AI assistant! Ask me about music, Rangers FC, gaming, or just have a blether! What's on your mind?`,
      sender: 'ai',
      timestamp: new Date(),
      personality: 'scottish'
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    const aiResponse = getAIResponse(inputMessage.trim(), user?.username || 'mate')
    
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: aiResponse.message,
      sender: 'ai',
      timestamp: new Date(),
      personality: aiResponse.personality
    }

    setMessages(prev => [...prev, aiMessage])
    setIsTyping(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getPersonalityEmoji = (personality?: string) => {
    switch (personality) {
      case 'scottish': return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
      case 'music': return '🎵'
      case 'gaming': return '🎮'
      default: return '🤖'
    }
  }

  const getPersonalityColor = (personality?: string) => {
    switch (personality) {
      case 'scottish': return 'from-blue-500 to-white'
      case 'music': return 'from-purple-500 to-pink-500'
      case 'gaming': return 'from-green-500 to-blue-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-white/10">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
        </div>
        <div>
          <h3 className="font-semibold text-white">Opure AI</h3>
          <p className="text-xs text-gray-400">Scottish AI Assistant • Online</p>
        </div>
        <div className="ml-auto">
          <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex items-start space-x-3 ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'ai' 
                  ? `bg-gradient-to-r ${getPersonalityColor(message.personality)}` 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}>
                {message.sender === 'ai' ? (
                  <span className="text-sm">{getPersonalityEmoji(message.personality)}</span>
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              
              <div className={`max-w-[70%] ${
                message.sender === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div className={`inline-block p-3 rounded-2xl ${
                  message.sender === 'ai'
                    ? 'bg-white/10 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start space-x-3"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/10 p-3 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about music, Rangers FC, or just chat..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              disabled={isTyping}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['Tell me about Rangers FC', 'Play some Juice WRLD', 'Gaming music please', 'What\'s your favorite song?'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputMessage(suggestion)}
              className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors"
              disabled={isTyping}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AIChat