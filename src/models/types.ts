/**
 * Core types for the AI Voice Agent Configuration Platform
 */

/**
 * Represents a business configuration for the voice agent
 */
export interface Business {
  /** Unique identifier for the business */
  id?: string;
  
  /** Name of the business */
  businessName: string;
  
  /** Type of business (e.g., E-commerce, Healthcare) */
  businessType: string;
  
  /** The specific use case for the voice agent */
  useCase: string;
  
  /** The role of the agent (e.g., Sales rep, Booking assistant) */
  agentRole: string;
  
  /** Tone preference for the agent's responses */
  tonePreference?: 'friendly' | 'professional' | 'neutral' | 'humorous';
  
  /** Custom branding phrases for intro/outro */
  brandingPhrases?: {
    intro?: string;
    outro?: string;
  };
  
  /** The initial state for the conversation */
  initialState: string;
  
  /** Definitions of all states in the conversation flow */
  stateDefinitions: Record<string, ConversationState>;
  
  /** Rules for disqualifying prospects */
  disqualificationRules: Array<{
    condition: string;
    message: string;
  }>;
  
  /** Knowledge base items for common questions and answers */
  knowledgeBase?: Array<KnowledgeBaseItem>;
  
  /** Actions to take after conversation completion */
  completionActions?: {
    webhook?: string;
    email?: string;
    notifyHuman?: boolean;
  };
  
  /** Language and region preference */
  locale?: string;
}

/**
 * Represents a knowledge base item for common questions and answers
 */
export interface KnowledgeBaseItem {
  /** Pattern to match for the question (can include regex-like patterns) */
  pattern: string;
  
  /** The response to provide when the pattern is matched */
  response: string;
}

/**
 * Represents a state in the conversation flow
 */
export interface ConversationState {
  /** Unique identifier for the state */
  id: string;
  
  /** Human-readable name for the state */
  name: string;
  
  /** The prompt to say in this state (can be a question or statement) */
  question: string;
  
  /** Alternative phrasings for the prompt */
  questionVariants?: string[];
  
  /** 
   * Expected input types from the user
   * Examples:
   * - "Any" - Accept any response
   * - "Yes/No" - Expecting yes or no answer
   * - "Name" - Expecting a name
   * - "Reason or objection" - Expecting some kind of reason or objection
   * - Comma-separated values represent multiple options
   */
  expectedInputs?: string;
  
  /** 
   * Expected keywords in user's response
   * Examples:
   * - "yes, no, maybe" - Looking for these specific words
   * - "(none)" - No specific keywords expected
   * - "Any" - Any keywords are acceptable
   * - Words separated by commas are treated as separate options
   */
  expectedKeywords?: string;
  
  /** Possible transitions from this state */
  transitions: Array<StateTransition>;
  
  /** Whether this is a terminal state */
  isTerminal?: boolean;
  
  /** Custom handlers for specific responses */
  responseHandlers?: Record<string, {
    response: string;
    nextState?: string;
  }>;
  
  /** Metadata about this state */
  metadata?: Record<string, any>;
}

/**
 * Represents a transition between states
 */
export interface StateTransition {
  /** The condition that triggers this transition */
  condition: string;
  
  /** The target state to transition to */
  targetState: string;
}

/**
 * Represents a user response in the conversation
 */
export interface UserResponse {
  /** The question ID this response is for */
  questionId: string;
  
  /** The actual response content */
  response: string;
  
  /** Whether the response is valid */
  valid: boolean;
  
  /** Timestamp when the response was received */
  timestamp: string;
  
  /** Any extracted entities from the response */
  entities?: Record<string, any>;
}

/**
 * Configuration for objection handling
 */
export interface ObjectionHandling {
  /** Common objections and their rebuttals */
  objections: Array<{
    pattern: string;
    rebuttal: string;
    useOnce?: boolean;
  }>;
  
  /** Maximum number of rebuttals before ending call */
  maxRebuttals?: number;
  
  /** Whether to enable objection handling */
  enabled: boolean;
}

/**
 * Configuration for the chat interface
 */
export interface ChatInterfaceConfig {
  /** Whether to show typing indicators */
  showTypingIndicator?: boolean;
  
  /** Delay between messages in ms */
  typingDelay?: number;
  
  /** Custom CSS theme */
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
  };
  
  /** Text for buttons and UI elements */
  uiText?: {
    sendButtonText?: string;
    placeholderText?: string;
    resetButtonText?: string;
  };
}

/**
 * Represents a full conversation session
 */
export interface ConversationSession {
  /** Unique session ID */
  id: string;
  
  /** Reference to the business configuration */
  businessId: string;
  
  /** Current state in the conversation */
  currentState: string;
  
  /** History of the conversation */
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    state?: string;
  }>;
  
  /** All collected user responses */
  responses: Record<string, UserResponse>;
  
  /** Whether the conversation has ended */
  isComplete: boolean;
  
  /** Reason for completion (success, disqualified, abandoned) */
  completionReason?: string;
  
  /** Start and end times */
  startTime: string;
  endTime?: string;
  
  /** Result summary */
  summary?: Record<string, any>;
} 