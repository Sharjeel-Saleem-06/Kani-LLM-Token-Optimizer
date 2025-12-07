/**
 * Global API configuration for the AI Voice Agent Platform
 * 
 * This file contains configuration settings for API integrations.
 * Import this file wherever API access is needed.
 */

// OpenAI API key pulled from environment at build time.
// For local dev, set NEXT_PUBLIC_OPENAI_API_KEY in a .env.local file (not committed).
export const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "";

// API configuration options
export const API_CONFIG = {
  openai: {
    apiKey: OPENAI_API_KEY,
    
    // Model selection:
    // - "gpt-3.5-turbo" is cheaper and faster but less capable
    // - "gpt-4" is more capable but more expensive
    // - "gpt-3.5-turbo-16k" has longer context window
    defaultModel: "gpt-3.5-turbo", // Using 3.5 to minimize token costs
    
    // Temperature controls randomness:
    // - 0.0: completely deterministic (always same response)
    // - 0.2-0.5: creative but focused (recommended for agents)
    // - 0.7-1.0: more random/creative (better for brainstorming)
    temperature: 0.2, // Low temperature for consistent responses
    
    // Maximum tokens in the response:
    // - Lower values = shorter responses = less tokens used
    // - For conversational agents, 75-150 is usually sufficient
    maxTokens: 75, // Limiting to 75 tokens to reduce costs
    
    // Token usage costs (approximate for calculations)
    costs: {
      gpt35Input: 0.002, // $0.002 per 1K tokens for GPT-3.5 input
      gpt35Output: 0.002, // $0.002 per 1K tokens for GPT-3.5 output
      gpt4Input: 0.03,    // $0.03 per 1K tokens for GPT-4 input
      gpt4Output: 0.06    // $0.06 per 1K tokens for GPT-4 output
    }
  }
};

/**
 * Gets the OpenAI API key - enables overriding at runtime
 * @returns The OpenAI API key
 */
export function getOpenAIApiKey(): string {
  return process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "";
}

/**
 * Gets the full OpenAI configuration
 * @returns The OpenAI configuration object
 */
export function getOpenAIConfig() {
  return API_CONFIG.openai;
}

/**
 * Calculate cost for token usage
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param model Model name (defaults to gpt-3.5-turbo)
 * @returns Calculated cost in USD
 */
export function calculateTokenCost(
  inputTokens: number, 
  outputTokens: number, 
  model: string = API_CONFIG.openai.defaultModel
): number {
  const costs = API_CONFIG.openai.costs;
  const isGpt4 = model.startsWith('gpt-4');
  
  if (isGpt4) {
    return (inputTokens / 1000 * costs.gpt4Input) + 
           (outputTokens / 1000 * costs.gpt4Output);
  } else {
    return (inputTokens / 1000 * costs.gpt35Input) + 
           (outputTokens / 1000 * costs.gpt35Output);
  }
}

export default API_CONFIG; 