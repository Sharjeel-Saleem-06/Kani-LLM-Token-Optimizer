/**
 * KaniService.ts
 * 
 * This service integrates with the Kani framework to provide memory-efficient
 * language model interactions for the voice agent platform.
 */

import { OpenAIApi, Configuration } from 'openai';
import { Business, ConversationState, UserResponse, KnowledgeBaseItem } from '../models/types';
import { getOpenAIApiKey, API_CONFIG, calculateTokenCost } from '../config/apiConfig';

/**
 * Handles memory management for the conversation
 */
class AgentMemory {
  private stateDefinitions: Record<string, any>;
  private userResponses: Record<string, any>;
  private currentState: string;
  private transitionHistory: Array<{from: string, to: string, reason: string}>;
  private disqualificationRules: Array<{condition: string, message: string}>;
  private knowledgeBase: Array<KnowledgeBaseItem>;
  private tokenUsage: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  // Track all context from form data
  private contextualData: Record<string, any>;
  private currentPrompt: string = '';
  private usedLLM: boolean = false;
  
  constructor(business: Business) {
    this.stateDefinitions = business.stateDefinitions || {};
    this.userResponses = {};
    this.currentState = business.initialState || 'greeting';
    this.transitionHistory = [];
    this.disqualificationRules = business.disqualificationRules || [];
    this.knowledgeBase = business.knowledgeBase || [];
    this.tokenUsage = {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0
    };
    this.contextualData = {
      businessName: business.businessName,
      businessType: business.businessType,
      useCase: business.useCase,
      agentRole: business.agentRole,
      tonePreference: business.tonePreference
    };
  }
  
  /**
   * Get the token usage statistics
   */
  getTokenUsage() {
    return this.tokenUsage;
  }
  
  /**
   * Get the current prompt
   */
  getCurrentPrompt(): string {
    return this.currentPrompt;
  }
  
  /**
   * Set the current prompt
   */
  setCurrentPrompt(prompt: string): void {
    this.currentPrompt = prompt;
  }
  
  /**
   * Get transition count
   */
  getTransitionCount(): number {
    return this.transitionHistory.length;
  }
  
  /**
   * Check if LLM was used in the last interaction
   */
  wasLLMUsed(): boolean {
    return this.usedLLM;
  }
  
  /**
   * Set whether LLM was used
   */
  setLLMUsed(used: boolean): void {
    this.usedLLM = used;
  }
  
  /**
   * Update token usage statistics
   */
  updateTokenUsage(inputTokens: number, outputTokens: number) {
    this.tokenUsage.inputTokens += inputTokens;
    this.tokenUsage.outputTokens += outputTokens;
    this.tokenUsage.totalTokens += (inputTokens + outputTokens);
    
    // Use the centralized cost calculation function
    this.tokenUsage.estimatedCost = calculateTokenCost(
      this.tokenUsage.inputTokens,
      this.tokenUsage.outputTokens
    );
  }
  
  /**
   * Store a user response in memory
   */
  storeResponse(questionId: string, response: string, valid: boolean = true): void {
    this.userResponses[questionId] = {
      value: response,
      valid,
      timestamp: new Date().toISOString()
    };
    
    // Try to extract meaningful entities from the response
    const currentState = this.stateDefinitions[this.currentState];
    if (currentState?.expectedInputs) {
      const expectedType = currentState.expectedInputs.toLowerCase();
      
      // Extract context based on expected input type - this is critical for form data
      if (expectedType.includes('name')) {
        // Store user's name in context
        this.contextualData.userName = response;
        console.log("Stored user name in context:", response);
      } else if (expectedType.includes('company') || expectedType.includes('business')) {
        this.contextualData.userCompany = response;
        console.log("Stored user company in context:", response);
      } else if (expectedType.includes('email')) {
        this.contextualData.userEmail = response;
        console.log("Stored user email in context:", response);
      } else if (expectedType.includes('phone')) {
        this.contextualData.userPhone = response;
        console.log("Stored user phone in context:", response);
      } else if (expectedType.includes('preference') || expectedType.includes('interest')) {
        this.contextualData.userPreference = response;
        console.log("Stored user preference in context:", response);
      } else if (expectedType.includes('order') || expectedType.includes('product')) {
        this.contextualData.userOrder = response;
        console.log("Stored user order in context:", response);
      } else if (expectedType.includes('address')) {
        this.contextualData.userAddress = response;
        console.log("Stored user address in context:", response);
      } else if (expectedType.includes('feedback')) {
        this.contextualData.userFeedback = response;
        console.log("Stored user feedback in context:", response);
      } else {
        // For any other expected input, store generically
        const key = `user${expectedType.charAt(0).toUpperCase() + expectedType.slice(1)}`;
        this.contextualData[key] = response;
        console.log(`Stored generic user data (${key}) in context:`, response);
      }

      // Record this in transition history to properly track state changes
      this.transitionHistory.push({
        from: this.currentState,
        to: this.currentState, // Same state but record the form data update
        reason: `Form data update: ${expectedType}`
      });
    }
  }
  
  /**
   * Determine the next state based on the current state and response
   */
  getNextState(response: string): string | null {
    const currentStateDefinition = this.stateDefinitions[this.currentState];
    
    if (!currentStateDefinition || !currentStateDefinition.transitions) {
      return null;
    }
    
    // Check each transition rule
    for (const transition of currentStateDefinition.transitions) {
      if (this.matchesCondition(response, transition.condition)) {
        // Record the transition
        this.transitionHistory.push({
          from: this.currentState,
          to: transition.targetState,
          reason: transition.condition
        });
        
        // Update current state
        this.currentState = transition.targetState;
        return transition.targetState;
      }
    }
    
    return null;
  }
  
  /**
   * Check if a response matches a condition
   */
  private matchesCondition(response: string, condition: string): boolean {
    // If the condition is "Any", always match
    if (condition.toLowerCase() === 'any') {
      return true;
    }
    
    // Normalize the response
    const normalizedResponse = response.toLowerCase().trim();
    
    // Process multiple condition options (comma separated)
    if (condition.includes(',')) {
      const options = condition.split(',').map(opt => opt.trim().toLowerCase());
      return options.some(opt => this.matchesSingleCondition(normalizedResponse, opt));
    }
    
    // Handle single condition
    return this.matchesSingleCondition(normalizedResponse, condition.toLowerCase());
  }
  
  /**
   * Check if a response matches a single condition
   */
  private matchesSingleCondition(response: string, condition: string): boolean {
    // Handle special patterns
    if (condition.startsWith('contains:')) {
      const content = condition.substring('contains:'.length).trim();
      return response.includes(content);
    }
    
    if (condition.startsWith('exact:')) {
      const content = condition.substring('exact:'.length).trim();
      return response === content;
    }
    
    if (condition.startsWith('starts:')) {
      const content = condition.substring('starts:'.length).trim();
      return response.startsWith(content);
    }
    
    if (condition.startsWith('ends:')) {
      const content = condition.substring('ends:'.length).trim();
      return response.endsWith(content);
    }
    
    // Check for regex patterns
    if (condition.includes('*') || condition.includes('+') || 
        condition.includes('?') || condition.includes('|')) {
      try {
        // Convert simplified pattern to real regex
        let regexString = condition
          .replace(/\*/g, '.*')
          .replace(/\+/g, '.+');
        
        const regex = new RegExp(regexString, 'i');
        return regex.test(response);
      } catch (error) {
        console.warn('Invalid regex pattern:', condition);
        return false;
      }
    }
    
    // Handle repetitive patterns like "ok ok ok"
    const words = response.split(/\s+/);
    const repeatedWords = words.filter((word, index, arr) => 
      index > 0 && word === arr[index - 1]
    );
    
    if (repeatedWords.length > 0 && repeatedWords.some(word => condition.includes(word))) {
      return true;
    }
    
    // Default: simple substring match
    return response.includes(condition);
  }
  
  /**
   * Check if a user query matches any knowledge base item
   */
  findKnowledgeBaseResponse(query: string): string | null {
    if (!this.knowledgeBase || this.knowledgeBase.length === 0) {
      return null;
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    for (const item of this.knowledgeBase) {
      try {
        // If the pattern contains regex-like characters, treat it as a regex
        if (/[\|\+\*\?\(\)\[\]]/.test(item.pattern)) {
          const regex = new RegExp(item.pattern, 'i');
          if (regex.test(normalizedQuery)) {
            // Dynamically replace any context variables in the response
            return this.replaceContextVariables(item.response);
          }
        } else {
          // Otherwise do a simple substring match
          const patternTerms = item.pattern.toLowerCase().split(/\s+/);
          const patternMatches = patternTerms.some(term => 
            normalizedQuery.includes(term) && term.length > 3 // Only match on meaningful terms
          );
          
          if (patternMatches) {
            return this.replaceContextVariables(item.response);
          }
        }
      } catch (error) {
        console.warn("Error matching knowledge base pattern:", error);
        // Fallback to simple substring match
        if (normalizedQuery.includes(item.pattern.toLowerCase())) {
          return this.replaceContextVariables(item.response);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Replace context variables in a string with values from contextual data
   * For example, "{userName}" would be replaced with the actual user's name
   */
  private replaceContextVariables(text: string): string {
    // Use regex to find all {variableName} patterns
    const variablePattern = /{([a-zA-Z0-9_]+)}/g;
    
    return text.replace(variablePattern, (match, variableName) => {
      // Check if the variable exists in contextual data
      if (this.contextualData[variableName] !== undefined) {
        return this.contextualData[variableName];
      }
      
      // Return the original pattern if variable not found
      return match;
    });
  }
  
  /**
   * Check if a response should trigger disqualification
   */
  isDisqualified(response: string): {disqualified: boolean, message?: string} {
    if (!this.disqualificationRules || this.disqualificationRules.length === 0) {
      return { disqualified: false };
    }
    
    for (const rule of this.disqualificationRules) {
      if (this.matchesCondition(response, rule.condition)) {
        return {
          disqualified: true,
          message: rule.message
        };
      }
    }
    
    return { disqualified: false };
  }
  
  /**
   * Get the next question for the current state
   */
  getNextQuestion(): string | null {
    const currentStateDefinition = this.stateDefinitions[this.currentState];
    
    if (!currentStateDefinition) {
      return null;
    }
    
    // Check if we have variants and randomly select one
    if (currentStateDefinition.questionVariants && 
        Array.isArray(currentStateDefinition.questionVariants) && 
        currentStateDefinition.questionVariants.length > 0) {
      
      const variants = [currentStateDefinition.question, ...currentStateDefinition.questionVariants];
      const randomIndex = Math.floor(Math.random() * variants.length);
      return variants[randomIndex];
    }
    
    return currentStateDefinition.question || null;
  }
  
  /**
   * Get the current state
   */
  getCurrentState(): string {
    return this.currentState;
  }
  
  /**
   * Get the current state definition
   */
  getCurrentStateDefinition(): any {
    return this.stateDefinitions[this.currentState] || null;
  }
  
  /**
   * Build minimal context required for LLM
   */
  buildMinimalContext(): Record<string, any> {
    return {
      currentState: this.currentState,
      // Only include the most recent responses that are relevant
      relevantResponses: this.getRelevantResponses(),
      stateDefinition: this.stateDefinitions[this.currentState] || {},
      // Include at most the last 5 transitions
      recentTransitions: this.transitionHistory.slice(-5),
      // Include contextual data
      contextualData: this.contextualData
    };
  }
  
  /**
   * Get only the responses relevant to the current conversation context
   */
  private getRelevantResponses(): Record<string, any> {
    // Get user responses and make a more efficient context
    const relevantResponses: Record<string, any> = {};
    
    // Include the last 7 responses as a better approximation for meaningful context
    const questionIds = Object.keys(this.userResponses);
    const recentQuestionIds = questionIds.slice(-7);
    
    for (const id of recentQuestionIds) {
      relevantResponses[id] = this.userResponses[id];
    }
    
    return relevantResponses;
  }
  
  /**
   * Determine if the response requires LLM processing
   * This is the critical decision point for using memory vs LLM
   */
  shouldUseLLM(response: string): boolean {
    // First check if this is a direct question that needs LLM
    if (response.endsWith('?') && response.length > 10) {
      // Check if the question is about stored form data
      for (const key in this.contextualData) {
        if (key !== 'businessName' && key !== 'businessType' && key !== 'useCase' && 
            key !== 'agentRole' && key !== 'tonePreference') {
          const value = this.contextualData[key];
          
          // If the user is asking about data we already have, we should NOT use LLM
          if (value && response.toLowerCase().includes(key.toLowerCase().replace('user', ''))) {
            console.log(`Question about known data (${key}), using memory not LLM`);
            return false;
          }
        }
      }
      
      // If we get here, it's likely a question not related to stored data
      console.log("User asked a question not relating to stored form data, using LLM");
      return true;
    }
    
    // Check if we have a predefined path for this response
    const currentStateDefinition = this.stateDefinitions[this.currentState];
    
    if (!currentStateDefinition || !currentStateDefinition.transitions) {
      // No defined transitions, use LLM as fallback
      return true;
    }
    
    // Special pattern check for complex inputs and objection handling
    const expectedInputs = currentStateDefinition.expectedInputs?.toLowerCase() || '';
    const expectedKeywords = currentStateDefinition.expectedKeywords?.toLowerCase() || '';
    
    // If we're explicitly expecting complex inputs, use LLM
    if (expectedInputs.includes('reason') || 
        expectedInputs.includes('objection') ||
        expectedInputs.includes('explanation') ||
        expectedInputs.includes('description') ||
        expectedInputs.includes('feedback')) {
      return true;
    }
    
    // Special handling for "Any" in expected inputs or keywords
    if (expectedInputs === 'any' || expectedInputs.includes('any response') || 
        expectedKeywords === 'any' || expectedKeywords.includes('any')) {
      
      // Check if any transition condition contains "any" - if so, prioritize that transition
      for (const transition of currentStateDefinition.transitions) {
        if (transition.condition.toLowerCase().trim() === 'any') {
          // Use the "any" transition without LLM
          console.log("Found 'any' transition condition, using memory not LLM");
          return false;
        }
      }
      
      // Next, check if we have transitions that can handle this without LLM
      for (const transition of currentStateDefinition.transitions) {
        if (this.matchesCondition(response, transition.condition)) {
          // If we have a matching transition, don't use LLM
          console.log("Found matching transition for 'any' input, using memory not LLM");
          return false;
        }
      }
      
      // No matching transition found, use LLM
      return true;
    }
    
    // Check if any transition condition can handle this response
    for (const transition of currentStateDefinition.transitions) {
      if (this.matchesCondition(response, transition.condition)) {
        // We have a match through pattern matching - USE MEMORY NOT LLM
        console.log("Found transition match through pattern matching, using memory not LLM");
        return false;
      }
    }
    
    // If we get here, no transition matched, so use LLM as a fallback
    console.log("No matching transitions found, falling back to LLM");
    return true;
  }
}

/**
 * Main Kani service for voice agent
 */
export class KaniService {
  private openai: OpenAIApi | null;
  public memory: AgentMemory;
  private business: Business;
  private apiKey: string;
  private modelName: string;
  private responseDelay: number;
  
  constructor(
    apiKey: string = getOpenAIApiKey(), // Use the API key from config as default
    business: Business,
    modelName: string = API_CONFIG.openai.defaultModel, // Use model from config
    responseDelay: number = 750 // Default delay in milliseconds
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.business = business;
    this.memory = new AgentMemory(business);
    this.responseDelay = responseDelay;
    
    // Initialize OpenAI only if API key is provided
    if (this.apiKey) {
      const configuration = new Configuration({ apiKey: this.apiKey });
      this.openai = new OpenAIApi(configuration);
    } else {
      console.warn("OpenAI API key not set or invalid. Will use rule-based responses only.");
      this.openai = null;
    }
    
    // Log that we're initializing with the business data to debug
    console.log("KaniService initialized with business data:", business.businessName);
  }
  
  /**
   * Get token usage statistics
   */
  getTokenUsage() {
    return this.memory.getTokenUsage();
  }
  
  /**
   * Get the current prompt
   */
  getCurrentPrompt(): string {
    return this.memory.getCurrentPrompt();
  }
  
  /**
   * Get the number of transitions
   */
  getTransitionCount(): number {
    return this.memory.getTransitionCount();
  }
  
  /**
   * Check if the last interaction used the LLM
   */
  wasLLMUsed(): boolean {
    return this.memory.wasLLMUsed();
  }
  
  /**
   * Process user input and generate a response
   */
  async processUserInput(input: string): Promise<{
    response: string,
    nextState: string | null,
    disqualified: boolean
  }> {
    // First, check if this matches a knowledge base question
    const knowledgeResponse = this.memory.findKnowledgeBaseResponse(input);
    if (knowledgeResponse) {
      console.log("Found knowledge base response for:", input);
      
      // Mark that we used memory (not LLM)
      this.memory.setLLMUsed(false);
      
      // Return the response without changing state
      return {
        response: knowledgeResponse,
        nextState: this.memory.getCurrentState(),
        disqualified: false
      };
    }
    
    // Check if the input disqualifies the conversation
    const disqualificationCheck = this.memory.isDisqualified(input);
    if (disqualificationCheck.disqualified) {
      return {
        response: disqualificationCheck.message || "Sorry, we cannot proceed further.",
        nextState: null,
        disqualified: true
      };
    }
    
    // Store the response
    this.memory.storeResponse(this.memory.getCurrentState(), input);
    
    // Try to determine the next state based on transitions
    const nextState = this.memory.getNextState(input);
    
    // If we found a next state, return its question
    if (nextState) {
      const nextStateDefinition = this.memory.getCurrentStateDefinition();
      
      if (nextStateDefinition) {
        this.memory.setLLMUsed(false); // Used rule-based transition
        return {
          response: nextStateDefinition.question,
          nextState,
          disqualified: false
        };
      }
    }
    
    // Fall back to LLM for handling complex responses - ONLY AS FALLBACK
    try {
      // Set flag to indicate we're using LLM
      this.memory.setLLMUsed(true);
      console.log("Using LLM to handle response");
      
      // Check if OpenAI is properly initialized
      if (!this.openai) {
        console.warn("OpenAI client not initialized. Using fallback response.");
        return {
          response: "I'm not fully configured to respond intelligently yet. Please check your OpenAI API key configuration.",
          nextState: null,
          disqualified: false
        };
      }
      
      const context = this.memory.buildMinimalContext();
      const prompt = this.generateSystemPrompt(context);
      
      // Store the prompt for display in UI
      this.memory.setCurrentPrompt(prompt);
      
      // Approximate token count for input based on number of characters
      const inputTokenEstimate = Math.ceil((prompt.length + input.length) / 4);
      
      const completion = await this.openai.createChatCompletion({
        model: this.modelName, // Use the model name from constructor
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: input }
        ],
        temperature: API_CONFIG.openai.temperature, // Use temperature from config
        max_tokens: API_CONFIG.openai.maxTokens // Use max tokens from config
      });
      
      if (!completion.data || !completion.data.choices || completion.data.choices.length === 0) {
        throw new Error("Invalid response from OpenAI API");
      }
      
      let response = completion.data.choices[0]?.message?.content || 'I apologize, but I couldn\'t process that response.';
      
      // Check for and fix problematic character duplication that might come from LLM
      // Only fix obvious duplication (3+ consecutive chars) to preserve real words with double letters
      const problematicDuplication = /(.)\1{2,}/g;
      if (problematicDuplication.test(response)) {
        // Clean up only excessive character duplication (3+ of the same character)
        response = response.replace(problematicDuplication, '$1$1');
      }
      
      // Approximate token count for output based on response length
      const outputTokenEstimate = Math.ceil(response.length / 4);
      
      // Update token usage statistics
      this.memory.updateTokenUsage(inputTokenEstimate, outputTokenEstimate);
      
      // Try to determine next state after LLM response
      const nextState = this.determineStateFromLLMResponse(response, input);
      
      return {
        response,
        nextState,
        disqualified: false
      };
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      
      // Fallback to a simple response
      return {
        response: "I'm having trouble understanding. Could you please rephrase that?",
        nextState: null,
        disqualified: false
      };
    }
  }
  
  /**
   * Generate the system prompt with minimal context
   */
  private generateSystemPrompt(context: Record<string, any>): string {
    const { businessName, businessType, agentRole, useCase, tonePreference } = this.business;
    
    // Get the current state definition
    const stateDefinition = context.stateDefinition || {};
    const expectedInputs = stateDefinition.expectedInputs || '';
    const expectedKeywords = stateDefinition.expectedKeywords || '';
    
    // Format previous responses for context
    const responsesText = Object.entries(context.relevantResponses || {})
      .map(([id, resp]: [string, any]) => `- ${id}: "${resp.value}"`)
      .join('\n');
    
    // Format contextual data - THIS IS THE KEY FORM DATA
    const contextKeys = Object.keys(context.contextualData || {}).filter(k => 
      !['businessName', 'businessType', 'useCase', 'agentRole', 'tonePreference'].includes(k)
    );
    
    const contextDataText = contextKeys.length > 0 
      ? contextKeys.map(key => `- ${key}: ${context.contextualData[key]}`).join('\n')
      : 'No additional user data collected yet.';
    
    // Format the prompt to be more concise and optimize tokens
    return `You are a virtual assistant for ${businessName}, a ${businessType} business.

ROLE: ${agentRole} helping with ${useCase}

CURRENT STATE: ${context.currentState}
CURRENT QUESTION: "${stateDefinition.question || ''}"
EXPECTED INPUTS: ${expectedInputs}
EXPECTED KEYWORDS: ${expectedKeywords}

USER CONTEXT (FORM DATA - MOST IMPORTANT):
${contextDataText}

RECENT RESPONSES:
${responsesText}

RESPONSE GUIDELINES:
1. Use ${tonePreference || 'professional'} tone
2. Be very concise (under 50 words)
3. Stay focused on answering the current question 
4. Reference the form data whenever relevant
5. Do not ask new questions unless absolutely necessary
6. If user is off-topic, briefly acknowledge then guide back to the current question
7. If user asks about form data they've provided, answer directly using that data
8. Avoid unnecessary explanations or elaborations
9. Always relate your response to the user context data whenever possible to maintain continuity
10. When using LLM, try to tie responses back to previous form data for token optimization
11. Preserve correct spelling of words - do not truncate words with double letters
12. IMPORTANT: For words like "well", "address", "follow", etc., preserve all letters

After responding, guide the user back to the conversation flow established in the current question.`;
  }
  
  /**
   * Try to determine the next state from LLM response
   */
  private determineStateFromLLMResponse(llmResponse: string, userInput: string): string | null {
    // This is a simplified implementation
    // In a real system, this would analyze the LLM's response to determine
    // if it suggests a state transition
    
    // First, try direct state transition based on user input
    const nextStateFromRules = this.memory.getNextState(userInput);
    if (nextStateFromRules) {
      return nextStateFromRules;
    }
    
    // If no transition found from rules, look for clues in the LLM response
    // Check if the response contains keywords that might suggest a state
    const currentStateDefinition = this.memory.buildMinimalContext().stateDefinition;
    
    if (currentStateDefinition && currentStateDefinition.transitions) {
      for (const transition of currentStateDefinition.transitions) {
        // Look for transition target state references in the response
        const targetState = this.business.stateDefinitions[transition.targetState];
        if (targetState && targetState.name) {
          // Check if LLM response seems to be directing towards a specific state
          if (llmResponse.toLowerCase().includes(targetState.name.toLowerCase())) {
            console.log(`State transition detected from LLM response to: ${targetState.name}`);
            return transition.targetState;
          }
        }
      }
    }
    
    // No transition detected
    return null;
  }
}

export default KaniService; 

