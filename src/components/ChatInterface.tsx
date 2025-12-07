import React, { useState, useRef, useEffect } from 'react';
import { ChatInterfaceConfig } from '../models/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
  usedLLM?: boolean;
  memoryTag?: string;
  knowledgeBase?: boolean;
  disqualification?: boolean;
  contextData?: Record<string, any>;
}

interface ChatInterfaceProps {
  config: ChatInterfaceConfig;
  onSendMessage: (message: string) => Promise<string | { 
    message: string;
    usedLLM?: boolean;
    memoryTag?: string;
    knowledgeBase?: boolean;
    disqualification?: boolean;
  }>;
  onReset?: () => void;
  initialMessages?: ChatMessage[];
  initialGreeting?: string;
}

// Tell TypeScript about the global kaniService
declare global {
  interface Window {
    conversationContext?: {
      formData?: Record<string, any>;
    };
  }
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  config,
  onSendMessage,
  onReset,
  initialMessages = [],
  initialGreeting
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    showTypingIndicator = true,
    typingDelay = 30,
    theme = {
      primaryColor: '#4F46E5',
      backgroundColor: '#F9FAFB',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    uiText = {
      sendButtonText: 'Send',
      placeholderText: 'Type your message...',
      resetButtonText: 'Reset Conversation'
    }
  } = config;
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialGreeting && !initializedRef.current && messages.length === 0) {
      const greetingMessage: ChatMessage = {
        role: 'assistant',
        content: initialGreeting,
        timestamp: new Date().toISOString(),
        usedLLM: false,
        memoryTag: 'greeting'
      };
      
      if (showTypingIndicator) {
        simulateTyping(initialGreeting, false, 'greeting');
      } else {
        setMessages([greetingMessage]);
      }
      
      initializedRef.current = true;
    }
  }, [initialGreeting, showTypingIndicator]);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const analyzeUserMessage = (text: string): { 
    isQuestion: boolean;
    isComplexResponse: boolean;
    hasKnownContextKeywords: boolean;
    topicsDetected: string[];
  } => {
    const normalizedText = text.toLowerCase().trim();
    
    const isQuestion = text.endsWith('?') || /^(what|when|where|who|why|how|can|could|would|should|is|are|am|do|does|did|will|has|have)/.test(normalizedText);
    
    const objectionPatterns = [
      /too (expensive|costly|pricey)/i,
      /not interested/i,
      /don't have (time|budget)/i,
      /already have/i,
      /call me later/i,
      /need to think/i,
      /let me get back/i,
      /unsubscribe/i,
      /stop (calling|texting)/i
    ];
    
    const isComplexResponse = objectionPatterns.some(pattern => pattern.test(text));
    
    const possibleTopics = [];
    const topicPatterns = [
      { pattern: /(name|call me)/i, topic: 'name' },
      { pattern: /(email|contact|reach me at)/i, topic: 'email' },
      { pattern: /(phone|call|text)/i, topic: 'phone' },
      { pattern: /(company|business|organization|work at|work for)/i, topic: 'company' },
      { pattern: /(address|location|city|state|zip)/i, topic: 'address' },
      { pattern: /(preference|like|want|prefer|interested in)/i, topic: 'preference' },
      { pattern: /(order|product|purchase|buy)/i, topic: 'order' },
      { pattern: /(feedback|opinion|review|think about)/i, topic: 'feedback' }
    ];
    
    for (const {pattern, topic} of topicPatterns) {
      if (pattern.test(normalizedText)) {
        possibleTopics.push(topic);
      }
    }
    
    const formDataContext = getFormDataContext();
    let hasKnownContextKeywords = false;
    
    if (formDataContext) {
      for (const key in formDataContext) {
        if (key !== 'businessName' && key !== 'businessType' && key !== 'useCase' && 
            key !== 'agentRole' && key !== 'tonePreference') {
          const keyword = key.toLowerCase().replace('user', '');
          if (normalizedText.includes(keyword)) {
            hasKnownContextKeywords = true;
            if (!possibleTopics.includes(keyword)) {
              possibleTopics.push(keyword);
            }
          }
        }
      }
    }
    
    return {
      isQuestion,
      isComplexResponse,
      hasKnownContextKeywords,
      topicsDetected: possibleTopics
    };
  };
  
  const isApiErrorResponse = (text: string): boolean => {
    const errorPatterns = [
      /API key/i,
      /configuration/i,
      /OpenAI/i,
      /trouble processing/i,
      /not fully configured/i,
      /invalid/i,
      /expired/i,
      /overloaded/i,
      /rate limited/i
    ];
    
    return errorPatterns.some(pattern => pattern.test(text));
  };
  
  const detectLLMResponse = (response: string | { 
    message: string;
    usedLLM?: boolean;
    memoryTag?: string;
    knowledgeBase?: boolean;
    disqualification?: boolean;
  }): boolean => {
    if (typeof response === 'object' && response !== null && response.usedLLM !== undefined) {
      return response.usedLLM;
    }
    
    if (typeof response === 'string' && isApiErrorResponse(response)) {
      return true;
    }
    
    if (window.kaniService && typeof window.kaniService.wasLLMUsed === 'function') {
      return window.kaniService.wasLLMUsed();
    }
    
    if (typeof response === 'string') {
      if (response.length > 100) {
        return true;
      }
      
      const llmPatterns = [
        /I understand/i,
        /Based on your/i,
        /According to/i,
        /I apologize/i,
        /I'm sorry/i,
        /thank you for/i
      ];
      
      if (llmPatterns.some(pattern => pattern.test(response))) {
        return true;
      }
    }
    
    return false;
  };
  
  const getFormDataContext = (): Record<string, any> | null => {
    try {
      if (window.conversationContext && window.conversationContext.formData) {
        return window.conversationContext.formData;
      }
    } catch (e) {
      console.error('Error accessing form data context:', e);
    }
    
    return null;
  };
  
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsThinking(true);
    
    try {
      // Before sending, analyze the message
      const analysis = analyzeUserMessage(inputValue);
      
      // First, add a loading message to show thinking
      if (showTypingIndicator) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isLoading: true
          }
        ]);
      }
      
      // Get the form data context if available
      const contextData = getFormDataContext();
      
      // Now send to the server
      const response = await onSendMessage(inputValue);
      
      // Different rendering based on response type
      if (typeof response === 'object' && response !== null) {
        const { message, usedLLM, memoryTag, knowledgeBase, disqualification } = response;
        
        // Remove the loading message
        setMessages(prev => prev.filter(m => !m.isLoading));
        
        if (showTypingIndicator) {
          await simulateTyping(
            message, 
            usedLLM, 
            memoryTag, 
            contextData, 
            knowledgeBase, 
            disqualification
          );
        } else {
          setMessages(prev => [
            ...prev.filter(m => !m.isLoading),
            {
              role: 'assistant',
              content: message,
              timestamp: new Date().toISOString(),
              usedLLM: usedLLM,
              memoryTag: memoryTag,
              contextData: contextData,
              knowledgeBase: knowledgeBase,
              disqualification: disqualification
            }
          ]);
        }
      } else {
        // It's a string response
        const usedLLM = detectLLMResponse(response);
        
        // Remove the loading message
        setMessages(prev => prev.filter(m => !m.isLoading));
        
        if (showTypingIndicator) {
          await simulateTyping(
            typeof response === 'string' ? response : response.message, 
            usedLLM, 
            '', 
            contextData
          );
        } else {
          setMessages(prev => [
            ...prev.filter(m => !m.isLoading),
            {
              role: 'assistant',
              content: typeof response === 'string' ? response : response.message,
              timestamp: new Date().toISOString(),
              usedLLM: usedLLM,
              contextData: contextData
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the loading message
      setMessages(prev => prev.filter(m => !m.isLoading));
      
      // Add an error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, there was an error processing your request. ${error.message || ''}`,
          timestamp: new Date().toISOString(),
          usedLLM: false
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      inputRef.current?.focus();
    }
  };
  
  const simulateTyping = async (
    text: string, 
    usedLLM: boolean = false, 
    memoryTag: string = '', 
    contextData?: Record<string, any>,
    knowledgeBase: boolean = false,
    disqualification: boolean = false
  ): Promise<void> => {
    if (!showTypingIndicator) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
          usedLLM,
          memoryTag,
          contextData,
          knowledgeBase,
          disqualification
        }
      ]);
      return;
    }
    
    // Add a loading message first
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isLoading: true,
        usedLLM,
        memoryTag,
        contextData,
        knowledgeBase,
        disqualification
      }
    ]);
    
    // Wait a bit to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let currentText = '';
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + ' ';
      
      setMessages(prev => {
        const newMessages = [...prev];
        const loadingMsgIndex = newMessages.findIndex(m => m.isLoading);
        
        if (loadingMsgIndex !== -1) {
          newMessages[loadingMsgIndex] = {
            ...newMessages[loadingMsgIndex],
            content: currentText,
            isLoading: i < words.length - 1
          };
        }
        
        return newMessages;
      });
      
      // Add a delay between words
      const delay = typingDelay * (Math.random() * 1.5 + 0.5);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleReset = () => {
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    setIsThinking(false);
    initializedRef.current = false;
    
    if (onReset) {
      onReset();
    }
    
    if (initialGreeting) {
      setTimeout(() => {
        if (showTypingIndicator) {
          simulateTyping(initialGreeting, false, 'greeting');
        } else {
          setMessages([{
            role: 'assistant',
            content: initialGreeting,
            timestamp: new Date().toISOString(),
            usedLLM: false,
            memoryTag: 'greeting'
          }]);
        }
        initializedRef.current = true;
      }, 300);
    }
  };
  
  const formatFormData = (contextData?: Record<string, any>): React.ReactNode => {
    if (!contextData) return null;
    
    const relevantData: Record<string, string> = {};
    
    Object.keys(contextData).forEach(key => {
      if (key.startsWith('user') && 
          key !== 'useCase' && 
          contextData[key] && 
          typeof contextData[key] === 'string') {
        const displayKey = key.replace('user', '');
        relevantData[displayKey] = contextData[key];
      }
    });
    
    if (Object.keys(relevantData).length === 0) return null;
    
    return (
      <div className="mt-2 text-xs p-2 bg-gray-50 rounded border border-gray-200">
        <div className="font-semibold mb-1 text-gray-500">Form data used:</div>
        <div className="grid grid-cols-1 gap-1">
          {Object.entries(relevantData).map(([key, value]) => (
            <div key={key} className="flex">
              <span className="font-medium text-gray-600 mr-1">{key}:</span>
              <span className="text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderMessageBubble = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <div 
        key={`${message.timestamp}-${index}`} 
        className={`flex my-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div 
          className={`px-4 py-3 rounded-lg max-w-[80%] ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-br-none' 
              : message.knowledgeBase
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 text-blue-900 rounded-bl-none'
              : message.disqualification
              ? 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-900 rounded-bl-none'
              : message.usedLLM
              ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 shadow-sm rounded-bl-none'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
          } ${message.isLoading ? 'animate-pulse' : ''}`}
        >
          {message.knowledgeBase && (
            <div className="text-xs text-blue-600 flex items-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Knowledge Base</span>
            </div>
          )}
          
          {message.disqualification && (
            <div className="text-xs text-red-600 flex items-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Disqualified</span>
            </div>
          )}
          
          {message.usedLLM && !message.knowledgeBase && !message.disqualification && (
            <div className="text-xs text-gray-500 flex items-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <span>AI Model</span>
            </div>
          )}
          
          {message.isLoading ? (
            <div className="typing-animation">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          ) : (
            <div>
              {message.content}
              
              {/* Show contextual data if available */}
              {message.contextData && Object.keys(message.contextData).length > 0 && (
                <div className="mt-2 text-sm">
                  {formatFormData(message.contextData)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-700 to-blue-600 rounded-t-lg p-4">
        <h3 className="text-white font-semibold text-lg">Conversation Simulator</h3>
        <p className="text-blue-100 text-xs mt-1">Follow the conversation states defined in your form.</p>
      </div>
      
      <div
        className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white" 
        style={{ 
          fontFamily: theme.fontFamily,
          scrollBehavior: 'smooth' // Added for smoother scrolling
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Your conversation will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {messages.map((message, index) => renderMessageBubble(message, index))}
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" /> {/* Added height to ensure better scrolling */}
      </div>
      
      <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-lg">
        <div className="flex items-center">
          <input
            type="text"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={uiText.placeholderText}
            disabled={isLoading}
            className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={inputValue.trim() === '' || isLoading}
            className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-4 py-3 rounded-r-lg font-medium hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </span>
            ) : (
              uiText.sendButtonText
            )}
          </button>
        </div>
        
        {onReset && (
          <div className="flex justify-center mt-2">
            <button 
              onClick={handleReset}
              className="text-gray-500 text-sm hover:text-indigo-600 focus:outline-none transition-colors duration-200"
            >
              {uiText.resetButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface; 