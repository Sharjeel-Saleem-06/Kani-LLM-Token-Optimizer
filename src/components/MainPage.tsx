import React, { useState, useEffect, useContext } from 'react';
import BusinessConfigForm from './BusinessConfigForm';
import ChatInterface from './ChatInterface';
import { Business, ChatInterfaceConfig } from '../models/types';
import KaniService from '../services/KaniService';
import PromptGeneratorService from '../services/PromptGeneratorService';
import sampleBusinessConfig from '../config/sampleBusinessConfig';
import { getOpenAIApiKey, API_CONFIG } from '../config/apiConfig';
import { KaniContext } from '../pages/_app';

const MainPage: React.FC = () => {
  const { kaniService, setKaniService } = useContext(KaniContext);
  const [business, setBusiness] = useState<Business | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [showDemo, setShowDemo] = useState<boolean>(false);
  const [initialGreeting, setInitialGreeting] = useState<string>('');
  const [apiKeyError, setApiKeyError] = useState<boolean>(false);
  // Track the current step
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [tokenUsage, setTokenUsage] = useState({
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0
  });
  const [conversationStats, setConversationStats] = useState({
    messageCount: 0,
    avgResponseTime: 0,
    successRate: 0,
    transitions: 0
  });
  
  // Update metrics periodically when kaniService is active
  useEffect(() => {
    if (!kaniService) return;
    
    const updateMetrics = () => {
      if (kaniService) {
        const usage = kaniService.getTokenUsage();
        setTokenUsage(usage);
        // Get the current prompt from the service
        const prompt = kaniService.getCurrentPrompt();
        if (prompt) {
          setCurrentPrompt(prompt);
        }
        
        // Update transitions count
        setConversationStats(prev => ({
          ...prev,
          transitions: kaniService.getTransitionCount()
        }));
      }
    };
    
    // Update metrics immediately
    updateMetrics();
    
    // Then set up interval to update periodically
    const intervalId = setInterval(updateMetrics, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [kaniService]);
  
  // Handle form submission and generate the agent
  const handleGenerateAgent = (config: Business) => {
    console.log("Generating agent with states:", Object.keys(config.stateDefinitions).length);
    console.log("States:", Object.keys(config.stateDefinitions));
    
    setBusiness(config);
    
    // Generate the system prompt
    const prompt = PromptGeneratorService.generateSystemPrompt(config);
    setSystemPrompt(prompt);
    
    // Check if the API key is properly configured
    const apiKey = getOpenAIApiKey();
    const isInvalidKey = !apiKey;
    
    setApiKeyError(isInvalidKey);
    
    if (isInvalidKey) {
      console.warn("Missing OpenAI API key. Set NEXT_PUBLIC_OPENAI_API_KEY in your .env.local file.");
    }
    
    // Create a new Kani service with the API key from config and longer response delay
    const service = new KaniService(apiKey, config, API_CONFIG.openai.defaultModel, 1000);
    setKaniService(service);
    
    // Get the initial greeting from the initial state
    const initialStateId = config.initialState;
    const initialState = config.stateDefinitions[initialStateId];
    
    // Using the question field (which serves as the prompt)
    if (initialState && initialState.question) {
      setInitialGreeting(initialState.question);
    } else {
      setInitialGreeting("Hello! How can I assist you today?");
    }
    
    // Reset metrics
    setTokenUsage({
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0
    });
    
    setConversationStats({
      messageCount: 0,
      avgResponseTime: 0,
      successRate: 0,
      transitions: 0
    });
    
    setShowDemo(true);
    // Move to the next step after generating
    setCurrentStep(2);
  };
  
  // Handle message sending to the Kani service
  const handleSendMessage = async (message: string): Promise<string> => {
    if (!kaniService) {
      return 'Agent not initialized. Please generate the agent first.';
    }
    
    // Track start time for measuring response time
    const startTime = performance.now();
    
    try {
      // Update message count before processing
      setConversationStats(prev => ({
        ...prev,
        messageCount: prev.messageCount + 1
      }));
      
      const response = await kaniService.processUserInput(message);
      
      // Calculate response time
      const responseTime = performance.now() - startTime;
      
      // Update conversation stats
      setConversationStats(prev => {
        const newStats = {
          ...prev,
          avgResponseTime: ((prev.avgResponseTime * (prev.messageCount - 1)) + responseTime) / prev.messageCount,
          successRate: prev.messageCount > 0 ? ((prev.messageCount - 1) / prev.messageCount) * 100 : 100,
          transitions: kaniService.getTransitionCount()
        };
        return newStats;
      });
      
      // Update token usage stats
      const usage = kaniService.getTokenUsage();
      setTokenUsage(usage);
      
      // Get the current prompt
      const currentPrompt = kaniService.getCurrentPrompt();
      if (currentPrompt) {
        setCurrentPrompt(currentPrompt);
      }
      
      // Check for the special case where OpenAI is not configured
      if (response.response.includes("API key") || response.response.includes("configuration")) {
        console.warn("OpenAI API key validation issue detected in response");
        setApiKeyError(true);
      }
      
      // Add information about whether LLM was used
      const result = {
        ...response,
        usedLLM: kaniService.wasLLMUsed()
      };
      
      return result.response;
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Update stats for failed response
      setConversationStats(prev => ({
        ...prev,
        successRate: ((prev.messageCount - 1) / prev.messageCount) * 100
      }));
      
      return 'Sorry, there was an error processing your message. Please try again.';
    }
  };
  
  // Handle resetting the chat
  const handleResetChat = () => {
    // Re-initialize Kani service with the same configuration
    if (business) {
      const service = new KaniService(getOpenAIApiKey(), business, API_CONFIG.openai.defaultModel, 1000);
      setKaniService(service);
      
      // Reset metrics
      setTokenUsage({
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0
      });
      
      setConversationStats({
        messageCount: 0,
        avgResponseTime: 0,
        successRate: 0,
        transitions: 0
      });
    }
  };
  
  // Load sample configuration
  const handleLoadSample = () => {
    setBusiness(sampleBusinessConfig);
  };
  
  // Chat interface configuration
  const chatConfig: ChatInterfaceConfig = {
    showTypingIndicator: true,
    typingDelay: 50, // Increased from 30 to 50
    theme: {
      primaryColor: '#4F46E5',
      backgroundColor: '#F9FAFB',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    uiText: {
      sendButtonText: 'Send',
      placeholderText: 'Type your message...',
      resetButtonText: 'Reset Conversation'
    }
  };
  
  // Calculate approximate token savings from using Kani Memory
  const calculateTokenSavings = () => {
    const { messageCount } = conversationStats;
    const { totalTokens } = tokenUsage;
    
    if (messageCount === 0 || totalTokens === 0) return '0%';
    
    // Rough estimate: without memory optimization, each message would use about 200 tokens more
    const estimatedTokensWithoutMemory = totalTokens + (messageCount * 200);
    const savings = ((estimatedTokensWithoutMemory - totalTokens) / estimatedTokensWithoutMemory) * 100;
    
    return `${Math.round(savings)}%`;
  };

  // Format metrics data for display
  const getMetricsData = () => {
    return {
      tokenUsage: {
        totalTokens: tokenUsage.totalTokens.toString(),
        inputTokens: tokenUsage.inputTokens.toString(),
        outputTokens: tokenUsage.outputTokens.toString(),
        estimatedCost: `$${tokenUsage.estimatedCost.toFixed(5)}`
      },
      conversationStats: {
        messageCount: conversationStats.messageCount,
        successRate: `${Math.round(conversationStats.successRate)}%`,
        avgResponseTime: `${Math.round(conversationStats.avgResponseTime)}ms`,
        transitions: conversationStats.transitions || 0,
        tokenSavings: calculateTokenSavings()
      }
    };
  };
  
  // Navigation handlers
  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };
  
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Configuration step
        return (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 w-full">
            <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947z" clipRule="evenodd" />
                <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              Configure Your Agent
            </h2>
            
            <div className="mb-4">
              <button 
                onClick={handleLoadSample}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 mb-4 font-medium transition-colors duration-200"
              >
                Load Sample Configuration
              </button>
            </div>
            
            <BusinessConfigForm 
              onSubmit={handleGenerateAgent} 
              initialConfig={business || undefined} 
              metricsData={showDemo ? getMetricsData() : undefined}
            />
          </div>
        );
      
      case 2: // Test agent step
        return (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 w-full">
            <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Test Your Agent
            </h2>
            
            {apiKeyError && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      API key is not configured properly. The agent will use rule-based responses only, without LLM functionality.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="h-[600px]"> {/* Increased height for better usability */}
              <ChatInterface 
                config={chatConfig} 
                onSendMessage={handleSendMessage}
                onReset={handleResetChat}
                initialGreeting={initialGreeting}
              />
            </div>
            
            <div className="flex justify-between mt-4">
              <button 
                onClick={goToPreviousStep}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 font-medium transition-colors duration-200"
              >
                Back to Configuration
              </button>
              <button 
                onClick={goToNextStep}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-colors duration-200"
              >
                View Analytics
              </button>
            </div>
          </div>
        );
      
      case 3: // Analytics step
        return (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 w-full">
            <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
              Analytics & System Prompt
            </h2>
            
            <div className="mb-4">
              <div className="bg-gradient-to-t from-gray-50 to-white p-4 rounded-lg border border-gray-200 mb-6">
                <h3 className="text-sm font-medium text-indigo-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Kani Memory Stats
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div className="text-gray-600 font-medium">Tokens Used:</div>
                  <div className="font-semibold text-gray-900">{tokenUsage.totalTokens}</div>
                  
                  <div className="text-gray-600 font-medium">Cost Estimate:</div>
                  <div className="font-semibold text-gray-900">${tokenUsage.estimatedCost.toFixed(5)}</div>
                  
                  <div className="text-gray-600 font-medium">Memory Savings:</div>
                  <div className="font-semibold text-gray-900">{calculateTokenSavings()}</div>
                  
                  <div className="text-gray-600 font-medium">Transitions:</div>
                  <div className="font-semibold text-gray-900">{conversationStats.transitions}</div>
                </div>
              </div>
              
              <h3 className="text-sm font-medium text-indigo-600 flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Generated Prompt
              </h3>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{currentPrompt || systemPrompt}</pre>
              </div>
              
              <div className="flex justify-between mt-8">
                <button 
                  onClick={goToPreviousStep}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 font-medium transition-colors duration-200"
                >
                  Back to Testing
                </button>
                <button 
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-colors duration-200"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Voice Agent Platform</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Configure your AI voice agent's conversation flow, test it in real-time, and optimize for different business needs.
          </p>
        </header>
        
        {/* Step Indicator */}
        <div className="mb-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-full ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                1
              </div>
              <span className="mt-1 text-sm">Configure</span>
            </div>
            
            <div className={`w-full border-t ${currentStep >= 2 ? 'border-indigo-600' : 'border-gray-200'} mx-2`}></div>
            
            <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-full ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                2
              </div>
              <span className="mt-1 text-sm">Test</span>
            </div>
            
            <div className={`w-full border-t ${currentStep >= 3 ? 'border-indigo-600' : 'border-gray-200'} mx-2`}></div>
            
            <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-full ${currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                3
              </div>
              <span className="mt-1 text-sm">Analytics</span>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="max-w-4xl mx-auto">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default MainPage; 