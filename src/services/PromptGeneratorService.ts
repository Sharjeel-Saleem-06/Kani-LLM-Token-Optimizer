/**
 * PromptGeneratorService.ts
 * 
 * This service generates the system prompt for the AI agent based on the business configuration.
 */

import { Business, ConversationState } from '../models/types';

/**
 * Generates the system prompt for the OpenAI API call
 */
export class PromptGeneratorService {
  /**
   * Generate the full system prompt from a business configuration
   */
  static generateSystemPrompt(business: Business): string {
    const {
      businessName,
      businessType,
      useCase,
      agentRole,
      tonePreference = 'professional',
      brandingPhrases,
      initialState,
      stateDefinitions,
      disqualificationRules
    } = business;
    
    // Generate state definition section
    const stateDefinitionsText = this.generateStateDefinitions(stateDefinitions);
    
    // Generate disqualification rules section
    const disqualificationRulesText = this.generateDisqualificationRules(disqualificationRules);
    
    // Check if any state uses "Any" in inputs or keywords
    let anyNote = '';
    const hasAnyInputs = Object.values(stateDefinitions).some(state => 
      state.expectedInputs?.toLowerCase().includes('any')
    );
    
    const hasAnyKeywords = Object.values(stateDefinitions).some(state => 
      state.expectedKeywords?.toLowerCase().includes('any')
    );
    
    if (hasAnyInputs || hasAnyKeywords) {
      anyNote = `\nSPECIAL NOTE ABOUT "ANY":
- When 'Any' is specified in Expected Inputs, it means accepting any type of user response
- When 'Any' is specified in Expected Keywords, it means any keywords are acceptable
- Do NOT look for the literal word "any" in the user's response`;
    }
    
    // Check if any state uses (none) in keywords
    let noneNote = '';
    const hasNoneKeywords = Object.values(stateDefinitions).some(state => 
      state.expectedKeywords?.toLowerCase().includes('(none)')
    );
    
    if (hasNoneKeywords) {
      noneNote = `\nSPECIAL NOTE ABOUT "(NONE)":
- When '(none)' is specified in Expected Keywords, it means there are no specific keywords expected
- Do NOT look for the literal text "(none)" in the user's response
- Process the response without focusing on specific keywords`;
    }
    
    // Check if any state uses comma-separated values
    let commaNote = '';
    const hasCommaInputs = Object.values(stateDefinitions).some(state => 
      state.expectedInputs?.includes(',')
    );
    
    const hasCommaKeywords = Object.values(stateDefinitions).some(state => 
      state.expectedKeywords?.includes(',')
    );
    
    if (hasCommaInputs || hasCommaKeywords) {
      commaNote = `\nSPECIAL NOTE ABOUT COMMA-SEPARATED VALUES:
- When values are separated by commas in Expected Inputs or Keywords, each item is a separate option
- For example, "yes, okay, sure" means the user might say "yes" OR "okay" OR "sure"
- Match the user's response against any of the comma-separated values`;
    }
    
    // Generate main prompt
    return `You are a virtual AI agent for ${businessName}, a ${businessType} business.

Your role is to ${agentRole} and help with ${useCase}. Follow a precise structured conversation flow:

CONVERSATION STATES:
${stateDefinitionsText}

CURRENT STATE: ${initialState}

DISQUALIFICATION RULES:
${disqualificationRulesText}${anyNote}${noneNote}${commaNote}

GUIDELINES:
1. Stay on task according to the current state
2. Use ${tonePreference} tone in all communications
3. Use concise, human-like phrases
4. Don't repeat questions unnecessarily
5. Don't number the questions (no Q1, Q2, etc.)
6. Avoid special characters like $, %, @ unless part of user input
7. Respond naturally if the user says "Hi" or similar
8. For comma-separated values, recognize each item as a distinct option
9. If expected keywords contains "(none)", don't look for specific keywords in the response
10. IMPORTANT: Use correct spelling and preserve all letters in words with double letters
11. Use proper spelling for words like "address", "follow", "happy", "well", etc.
12. Keep responses natural with proper language usage

COMPLIANCE RULES:
- If asked "Are you AI?": Respond with "I\'m a virtual assistant here to help you with your request."
- If asked about location: Respond with "I\'m a virtual assistant assigned to help — my team can provide more if needed."
- Always use clear, respectful language
- Avoid slang, sarcasm, or confrontational replies
- Always assume positive intent

OBJECTION HANDLING:
- Use each rebuttal only once
- If resistance continues after one rebuttal, politely move forward
- If the user becomes abusive or uses profanity, end the conversation politely

${brandingPhrases?.intro ? `INTRO: ${brandingPhrases.intro}` : ''}
${brandingPhrases?.outro ? `OUTRO: ${brandingPhrases.outro}` : ''}

Remember to stay focused on completing the conversation flow efficiently. Only use creative reasoning for unclear or vague responses. Keep your responses concise and natural.`;
  }
  
  /**
   * Generate a textual representation of the state definitions
   */
  private static generateStateDefinitions(stateDefinitions: Record<string, ConversationState>): string {
    if (!stateDefinitions || Object.keys(stateDefinitions).length === 0) {
      return 'No states defined.';
    }
    
    return Object.entries(stateDefinitions)
      .map(([stateId, state]) => {
        const transitionsText = state.transitions.length > 0
          ? state.transitions
              .map(t => `   - If user response ${t.condition}: Go to ${t.targetState}`)
              .join('\n')
          : '   - No transitions defined.';
        
        // Add expected inputs and keywords if they exist
        let expectedInputsText = '';
        let expectedKeywordsText = '';
        
        // Handle expectedInputs with special formatting for comma-separated values
        if (state.expectedInputs) {
          if (state.expectedInputs.includes(',')) {
            // Split into an array and format as a list
            const inputsList = state.expectedInputs.split(',').map(s => s.trim()).filter(s => s.length > 0);
            expectedInputsText = `  Expected Inputs: "${state.expectedInputs}" (Options: ${inputsList.join(' | ')})`;
          } else {
            expectedInputsText = `  Expected Inputs: "${state.expectedInputs}"`;
          }
          
          // Add note if "Any" is present
          if (state.expectedInputs.toLowerCase().includes('any')) {
            expectedInputsText += ' (Accept any type of response)';
          }
        }
        
        // Handle expectedKeywords with special formatting for comma-separated values
        if (state.expectedKeywords) {
          // Special case for (none)
          if (state.expectedKeywords.toLowerCase().includes('(none)')) {
            expectedKeywordsText = `  Expected Keywords: "${state.expectedKeywords}" (No specific keywords required)`;
          } else if (state.expectedKeywords.includes(',')) {
            // Split into an array and format as a list
            const keywordsList = state.expectedKeywords.split(',').map(s => s.trim()).filter(s => s.length > 0);
            expectedKeywordsText = `  Expected Keywords: "${state.expectedKeywords}" (Keywords: ${keywordsList.join(' | ')})`;
            // Add list of alternative phrasings for similar keywords
            const keywordAlternatives = this.generateKeywordAlternatives(keywordsList);
            if (keywordAlternatives.length > 0) {
              expectedKeywordsText += `\n  Also accept similar phrases: ${keywordAlternatives.join(' | ')}`;
            }
          } else {
            expectedKeywordsText = `  Expected Keywords: "${state.expectedKeywords}"`;
            // For single keywords, provide alternatives directly
            const alternatives = this.generateSingleKeywordAlternatives(state.expectedKeywords);
            if (alternatives.length > 0) {
              expectedKeywordsText += ` (Also accept: ${alternatives.join(' | ')})`;
            }
          }
          
          // Add note if "Any" is present and (none) is not
          if (state.expectedKeywords.toLowerCase().includes('any') && !state.expectedKeywords.toLowerCase().includes('(none)')) {
            expectedKeywordsText += ' (Accept any keywords)';
          }
        }
        
        return `- State: ${state.name} (ID: ${stateId})
  Question: "${state.question}"
${expectedInputsText}
${expectedKeywordsText}
  Transitions:
${transitionsText}`;
      })
      .join('\n\n');
  }
  
  /**
   * Generate alternative phrasings for a list of keywords
   */
  private static generateKeywordAlternatives(keywords: string[]): string[] {
    const alternativePhrases: string[] = [];
    
    // Generate alternatives for common patterns
    for (const keyword of keywords) {
      const alternatives = this.generateSingleKeywordAlternatives(keyword);
      // Only add alternatives that aren't already in the keywords list
      for (const alt of alternatives) {
        if (!keywords.includes(alt) && !alternativePhrases.includes(alt)) {
          alternativePhrases.push(alt);
        }
      }
    }
    
    // Return only a reasonable number of alternatives to keep the prompt concise
    return alternativePhrases.slice(0, 5);
  }
  
  /**
   * Generate alternatives for a single keyword
   */
  private static generateSingleKeywordAlternatives(keyword: string): string[] {
    const normalizedKeyword = keyword.toLowerCase().trim();
    const alternatives: string[] = [];
    
    // Common yes variations
    if (['yes', 'yeah', 'yep', 'yup', 'sure'].includes(normalizedKeyword)) {
      alternatives.push('of course', 'definitely', 'absolutely', 'certainly');
    }
    
    // Common no variations
    else if (['no', 'nope', 'nah'].includes(normalizedKeyword)) {
      alternatives.push('not really', 'not interested', 'negative');
    }
    
    // Common later/maybe variations
    else if (['later', 'maybe', 'perhaps'].includes(normalizedKeyword)) {
      alternatives.push('not now', 'another time', 'not sure yet');
    }
    
    return alternatives;
  }
  
  /**
   * Generate a textual representation of the disqualification rules
   */
  private static generateDisqualificationRules(disqualificationRules: Array<{condition: string, message: string}>): string {
    if (!disqualificationRules || disqualificationRules.length === 0) {
      return 'No disqualification rules defined.';
    }
    
    return disqualificationRules
      .map(rule => `- If user response ${rule.condition}: End conversation with "${rule.message}"`)
      .join('\n');
  }
  
  /**
   * Generate a minimal contextual prompt for ongoing conversation
   */
  static generateContextualPrompt(
    business: Business,
    currentState: string,
    relevantResponses: Record<string, any>
  ): string {
    const { businessName, businessType, agentRole, tonePreference = 'professional' } = business;
    
    // Get the current state definition
    const stateDefinition = business.stateDefinitions[currentState];
    
    if (!stateDefinition) {
      return `You are a ${agentRole} for ${businessName}, a ${businessType} business. Use a ${tonePreference} tone. The conversation is in an undefined state. Try to understand what the user needs and respond appropriately.`;
    }
    
    // Format responses for context
    let responseContext = '';
    if (Object.keys(relevantResponses).length > 0) {
      responseContext = '\nPrevious responses:\n' + 
        Object.entries(relevantResponses)
          .map(([id, resp]) => `- ${id}: ${resp.value}`)
          .join('\n');
    }
    
    // Create a more focused prompt
    return `You are a ${agentRole} for ${businessName}, a ${businessType} business. Use a ${tonePreference} tone.

CURRENT STATE: ${currentState} - ${stateDefinition.name}
CURRENT QUESTION: "${stateDefinition.question}"
${stateDefinition.expectedInputs ? `EXPECTED INPUT TYPE: ${stateDefinition.expectedInputs}` : ''}
${stateDefinition.expectedKeywords ? `EXPECTED KEYWORDS: ${stateDefinition.expectedKeywords}` : ''}

${responseContext}

IMPORTANT GUIDELINES:
1. Keep your response natural, concise and conversational
2. Address the user's message directly in the context of the current question
3. Use proper spelling for all words (e.g., "well", "follow", "address", "hello")
4. Maintain a natural flow with proper language and grammar
5. Tie your response to previously collected form data whenever possible`;
  }
  
  /**
   * Generate a minimal prompt for processing user input
   */
  static generateMinimalPrompt(
    business: Business,
    currentState: string,
    userInput: string
  ): string {
    const { businessName, agentRole } = business;
    const stateDefinition = business.stateDefinitions[currentState];
    
    if (!stateDefinition) {
      return `As a ${agentRole} for ${businessName}, process this user input: "${userInput}" and provide a brief response. Use proper spelling and natural language.`;
    }
    
    return `As a ${agentRole} for ${businessName}, process this user input: "${userInput}"
Current question: "${stateDefinition.question}"
${stateDefinition.expectedInputs ? `Expected input type: ${stateDefinition.expectedInputs}` : ''}
${stateDefinition.expectedKeywords ? `Expected keywords: ${stateDefinition.expectedKeywords}` : ''}

Provide a brief, natural-sounding response (under 50 words). Use proper spelling for all words (like "well", "address", "hello", etc.). Tie your response to user's form data whenever possible.`;
  }
}

export default PromptGeneratorService; 
