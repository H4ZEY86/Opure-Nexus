import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Bot, User, Zap, Heart, Coffee, Music } from 'lucide-react'
import { useDiscord } from '../hooks/useDiscord'
import { buildApiUrl } from '../config/api'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  typing?: boolean
}

const scottishPrompts = [
  "What's your favorite Rangers FC memory?",
  "Tell me about Juice WRLD's impact on music",
  "What makes Scotland special?",
  "How do you feel about Scottish independence?",
  "Share some Scottish wisdom",
  "What's the best thing about Glasgow?",
  "Tell me a Scottish joke",
  "Explain Scottish slang to me"
]

const quickResponses = [
  { text: "Aye! 🏴󠁧󠁢󠁳󠁣󠁴󠁿", icon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { text: "Rangers forever! ⚽", icon: "⚽" },
  { text: "Juice WRLD 🎤", icon: "🎤" },
  { text: "Tell me more", icon: "💭" },
  { text: "That's mental!", icon: "🤯" },
  { text: "Brilliant!", icon: "✨" }
]

export default function AIChat() {
  const { user } = useDiscord()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Alright there! I'm Opure, your Scottish AI companion. Pure mental to meet ye! What's on yer mind today? Rangers? Juice WRLD? Or maybe ye want some proper Scottish wisdom?",
      sender: 'ai',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Send to AI endpoint
      const response = await fetch(buildApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          userId: user?.id,
          context: {
            username: user?.username,
            activity: 'discord-activity'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
        
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.response || "Aye, that's a right interesting point! Tell me more about that, will ye?",
          sender: 'ai',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (error) {
      console.error('AI Chat error:', error)
      
      // Fallback Scottish AI responses
      const fallbackResponses = [
        "Aye, that's pure mental! Rangers are the best team in Scotland, ken!",
        "Juice WRLD was a legend, rest in peace. His music still hits different, ye know?",
        "That's some proper Scottish wisdom right there! What else is on yer mind?",
        "I'm buzzing like a proper Rangers fan on derby day! Tell me more!",
        "Ach, that's brilliant! Ye've got a good head on yer shoulders, that's for sure!",
        "Pure class, that is! What other topics are rattling around in that brain of yours?",
        "Aye, I hear ye loud and clear! That's the kind of thinking we need more of!",
        "Mental! Absolutely mental! But in the best way possible, ken?"
      ]
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        sender: 'ai',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  const handleQuickResponse = (response: string) => {
    sendMessage(response)
  }

  const handlePromptClick = (prompt: string) => {
    setInputMessage(prompt)
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen flex flex-col pt-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border-b border-white/10 p-6"
      >
        <div className="max-w-4xl mx-auto flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Scottish AI Chat</h1>
            <p className="text-gray-300 text-sm">Your friendly Scottish AI companion - Rangers fan, Juice WRLD lover!</p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400 font-medium">Online</span>
          </div>
        </div>
      </motion.div>

      {/* Conversation Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 bg-white/5 border-b border-white/10"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-gray-400 mb-2">Try asking about:</div>
          <div className="flex flex-wrap gap-2">
            {scottishPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs hover:bg-blue-500/30 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 ${message.sender === 'user' ? 'ml-3' : 'mr-3'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-br from-green-400 to-blue-500' 
                        : 'bg-gradient-to-br from-purple-500 to-blue-600'
                    }`}>
                      {message.sender === 'user' ? (
                        user?.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`}
                            alt={user.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 shadow-lg ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                      : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-100'
                  }`}>
                    <div className="text-sm leading-relaxed">{message.content}</div>
                    <div className={`text-xs mt-2 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="flex mr-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl px-4 py-3 shadow-lg">
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
      </div>

      {/* Quick Responses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 bg-white/5 border-t border-white/10"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            {quickResponses.map((response, index) => (
              <button
                key={index}
                onClick={() => handleQuickResponse(response.text)}
                disabled={isLoading}
                className="flex items-center space-x-1 px-3 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{response.icon}</span>
                <span>{response.text}</span>
              </button>
            ))}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message... (Try asking about Rangers or Juice WRLD!)"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-800/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}