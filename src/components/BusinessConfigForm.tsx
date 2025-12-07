import React, { useState, useEffect } from 'react';
import { Business, ConversationState } from '../models/types';

interface BusinessConfigFormProps {
  onSubmit: (config: Business) => void;
  initialConfig?: Partial<Business>;
  metricsData?: {
    tokenUsage: {
      totalTokens: string;
      inputTokens: string;
      outputTokens: string;
      estimatedCost: string;
    };
    conversationStats: {
      messageCount: number;
      successRate: string;
      avgResponseTime: string;
      transitions: number;
      tokenSavings: string;
    };
  };
}

const BusinessConfigForm: React.FC<BusinessConfigFormProps> = ({
  onSubmit,
  initialConfig = {},
  metricsData = {
    tokenUsage: {
      totalTokens: '0',
      inputTokens: '0',
      outputTokens: '0',
      estimatedCost: '$0.0000'
    },
    conversationStats: {
      messageCount: 0,
      successRate: '--',
      avgResponseTime: '0ms',
      transitions: 0,
      tokenSavings: '0%'
    }
  }
}) => {
  const [formData, setFormData] = useState<Partial<Business>>({
    businessName: '',
    businessType: '',
    useCase: '',
    agentRole: '',
    tonePreference: 'professional',
    initialState: 'greeting',
    stateDefinitions: {},
    disqualificationRules: [],
    knowledgeBase: [],
    ...initialConfig
  });

  const [currentTab, setCurrentTab] = useState('basic');
  const [stateBeingEdited, setStateBeingEdited] = useState<string | null>(null);
  const [newStateName, setNewStateName] = useState('');
  const [newStateId, setNewStateId] = useState('');
  const [newStateQuestion, setNewStateQuestion] = useState('');
  const [newStateExpectedInputs, setNewStateExpectedInputs] = useState('');
  const [newStateExpectedKeywords, setNewStateExpectedKeywords] = useState('');
  const [showAddStateForm, setShowAddStateForm] = useState(true);
  const [showMetricsTab, setShowMetricsTab] = useState(false);
  
  // Add state variables for editing disqualification rules
  const [ruleBeingEdited, setRuleBeingEdited] = useState<number | null>(null);
  const [editRuleCondition, setEditRuleCondition] = useState('');
  const [editRuleMessage, setEditRuleMessage] = useState('');
  
  // First add state fields for editing a state
  const [editStateName, setEditStateName] = useState('');
  const [editStateQuestion, setEditStateQuestion] = useState('');
  const [editStateExpectedInputs, setEditStateExpectedInputs] = useState('');
  const [editStateExpectedKeywords, setEditStateExpectedKeywords] = useState('');
  
  // Add state variables for knowledge base management
  const [newQuestionPattern, setNewQuestionPattern] = useState('');
  const [newQuestionAnswer, setNewQuestionAnswer] = useState('');
  const [knowledgeBaseItems, setKnowledgeBaseItems] = useState<Array<{pattern: string; response: string}>>([]);
  const [editingKnowledgeItemIndex, setEditingKnowledgeItemIndex] = useState<number | null>(null);
  const [editKnowledgePattern, setEditKnowledgePattern] = useState('');
  const [editKnowledgeResponse, setEditKnowledgeResponse] = useState('');
  
  // Update form field
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Add a new conversation state
  const handleAddState = () => {
    if (!newStateId || !newStateName || !newStateQuestion) return;
    
    console.log("Adding new state:", newStateId);
    
    // Check if this state ID already exists
    if (formData.stateDefinitions && formData.stateDefinitions[newStateId]) {
      alert(`A state with ID "${newStateId}" already exists. Please use a unique ID.`);
      return;
    }
    
    const newState: ConversationState = {
      id: newStateId,
      name: newStateName,
      question: newStateQuestion,
      expectedInputs: newStateExpectedInputs,
      expectedKeywords: newStateExpectedKeywords,
      transitions: []
    };
    
    setFormData(prev => {
      const updatedStateDefinitions = {
        ...(prev.stateDefinitions || {}),
        [newStateId]: newState
      };
      
      console.log("Updated state definitions:", Object.keys(updatedStateDefinitions).length);
      console.log("State IDs:", Object.keys(updatedStateDefinitions));
      
      return {
        ...prev,
        stateDefinitions: updatedStateDefinitions,
        // If this is the first state, set it as the initial state
        initialState: Object.keys(prev.stateDefinitions || {}).length === 0 ? newStateId : prev.initialState
      };
    });
    
    // Reset the form
    setNewStateId('');
    setNewStateName('');
    setNewStateQuestion('');
    setNewStateExpectedInputs('');
    setNewStateExpectedKeywords('');
  };
  
  // Add a new transition to a state
  const handleAddTransition = (stateId: string, condition: string, targetState: string) => {
    if (!stateId || !condition || !targetState) {
      console.warn("Missing required fields for transition:", { stateId, condition, targetState });
      return;
    }
    
    console.log(`Adding transition from ${stateId} to ${targetState} with condition: ${condition}`);
    
    setFormData(prev => {
      const stateDefinitions = { ...prev.stateDefinitions };
      
      // Ensure the source state exists
      if (!stateDefinitions[stateId]) {
        console.error(`Source state ${stateId} does not exist`);
        return prev;
      }
      
      const state = { ...stateDefinitions[stateId] };
      
      state.transitions = [
        ...state.transitions,
        {
          condition,
          targetState
        }
      ];
      
      stateDefinitions[stateId] = state;
      
      return {
        ...prev,
        stateDefinitions
      };
    });
  };
  
  // Add a new disqualification rule
  const handleAddDisqualificationRule = (condition: string, message: string) => {
    // Process condition for repetitive text patterns
    const processedCondition = processRepetitivePattern(condition);
    
    setFormData(prev => ({
      ...prev,
      disqualificationRules: [
        ...(prev.disqualificationRules || []),
        {
          condition: processedCondition,
          message
        }
      ]
    }));
  };
  
  // Process repetitive patterns in condition text
  const processRepetitivePattern = (condition: string): string => {
    // If condition already has regex-like patterns, don't modify it
    if (condition.includes('*') || condition.includes('+') || condition.includes('?') || 
        condition.includes('(') || condition.includes(')') || condition.includes('[') || 
        condition.includes(']') || condition.includes('|')) {
      return condition;
    }
    
    // Handle prefix keywords for common condition types
    if (condition.startsWith('contains:')) {
      const content = condition.substring('contains:'.length).trim();
      return `.*${content}.*`;
    }
    
    if (condition.startsWith('exact:')) {
      const content = condition.substring('exact:'.length).trim();
      return `^${content}$`;
    }
    
    if (condition.startsWith('repeated:')) {
      const content = condition.substring('repeated:'.length).trim();
      return `(${content}\\s+){2,}`;
    }
    
    // Check for repetitive words or phrases
    const words = condition.trim().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      const count = wordCounts.get(word) || 0;
      wordCounts.set(word, count + 1);
    });
    
    // If any word appears multiple times consecutively, modify the condition
    const repeatedWords = Array.from(wordCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([word]) => word);
      
    if (repeatedWords.length > 0) {
      // Create a pattern that allows for repetition
      let patternedCondition = condition;
      repeatedWords.forEach(word => {
        // Replace multiple occurrences with a pattern that matches 1 or more
        const regex = new RegExp(`(${word}\\s+)+${word}`, 'g');
        patternedCondition = patternedCondition.replace(regex, `${word}+`);
      });
      return patternedCondition;
    }
    
    // Check for common phrases and variations
    const phrases = {
      'ok': ['ok', 'okay', 'OK', 'k', 'kk', 'kay'],
      'yes': ['yes', 'yeah', 'yep', 'yup', 'sure', 'definitely', 'absolutely'],
      'no': ['no', 'nope', 'nah', 'not', 'negative'],
      'hello': ['hello', 'hi', 'hey', 'hiya', 'greetings'],
      'bye': ['bye', 'goodbye', 'see you', 'later', 'cya'],
      'thanks': ['thanks', 'thank you', 'ty', 'thx', 'thank', 'appreciate']
    };
    
    // Check if the condition is a single word that has common variations
    const singleWord = condition.trim().toLowerCase();
    
    for (const [baseWord, variations] of Object.entries(phrases)) {
      if (variations.includes(singleWord)) {
        return `(${variations.join('|')})`;
      }
    }
    
    // If no patterns detected, return as is
    return condition;
  };
  
  // Add function to edit an existing rule
  const handleEditRule = (index: number) => {
    const rule = formData.disqualificationRules?.[index];
    if (rule) {
      setEditRuleCondition(rule.condition);
      setEditRuleMessage(rule.message);
      setRuleBeingEdited(index);
    }
  };
  
  // Add function to update an edited rule
  const handleUpdateRule = (index: number) => {
    if (!editRuleCondition || !editRuleMessage) return;
    
    // Process condition for repetitive text patterns
    const processedCondition = processRepetitivePattern(editRuleCondition);
    
    setFormData(prev => {
      const updatedRules = [...(prev.disqualificationRules || [])];
      updatedRules[index] = {
        condition: processedCondition,
        message: editRuleMessage
      };
      
      return {
        ...prev,
        disqualificationRules: updatedRules
      };
    });
    
    // Clear editing state
    setRuleBeingEdited(null);
    setEditRuleCondition('');
    setEditRuleMessage('');
  };
  
  // Add function to delete a rule
  const handleDeleteRule = (index: number) => {
    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to delete this disqualification rule?`)) {
      return;
    }
    
    setFormData(prev => {
      const updatedRules = [...(prev.disqualificationRules || [])];
      updatedRules.splice(index, 1);
      
      return {
        ...prev,
        disqualificationRules: updatedRules
      };
    });
    
    // Clear editing state if the deleted rule was being edited
    if (ruleBeingEdited === index) {
      setRuleBeingEdited(null);
      setEditRuleCondition('');
      setEditRuleMessage('');
    }
  };
  
  // Add delete state handler
  const handleDeleteState = (stateId: string) => {
    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to delete the state "${stateId}"? This will also remove any transitions to this state.`)) {
      return;
    }

    setFormData(prev => {
      // Create a copy of state definitions without the deleted state
      const stateDefinitions = { ...prev.stateDefinitions };
      delete stateDefinitions[stateId];
      
      // If deleted state was the initial state, set a new initial state
      let initialState = prev.initialState;
      if (initialState === stateId) {
        const stateIds = Object.keys(stateDefinitions);
        initialState = stateIds.length > 0 ? stateIds[0] : '';
      }
      
      // Remove any transitions to the deleted state
      Object.keys(stateDefinitions).forEach(otherStateId => {
        const state = stateDefinitions[otherStateId];
        state.transitions = state.transitions.filter(
          transition => transition.targetState !== stateId
        );
      });
      
      return {
        ...prev,
        stateDefinitions,
        initialState
      };
    });
    
    // Close edit mode if the deleted state was being edited
    if (stateBeingEdited === stateId) {
      setStateBeingEdited(null);
    }
  };
  
  // Add state update handlers
  const handleUpdateState = (stateId: string) => {
    if (!editStateName || !editStateQuestion) return;
    
    setFormData(prev => {
      const stateDefinitions = { ...prev.stateDefinitions };
      const state = { ...stateDefinitions[stateId] };
      
      // Update state properties
      state.name = editStateName;
      state.question = editStateQuestion;
      state.expectedInputs = editStateExpectedInputs;
      state.expectedKeywords = editStateExpectedKeywords;
      
      stateDefinitions[stateId] = state;
      
      return {
        ...prev,
        stateDefinitions
      };
    });
    
    // Clear the editing state to return to view mode
    setStateBeingEdited(null);
  };
  
  // Load state data for editing
  const handleEditStateClick = (stateId: string) => {
    const isAlreadyEditing = stateId === stateBeingEdited;
    
    // If already editing, toggle off
    if (isAlreadyEditing) {
      setStateBeingEdited(null);
      return;
    }
    
    // Get state data
    const state = formData.stateDefinitions?.[stateId];
    if (state) {
      setEditStateName(state.name);
      setEditStateQuestion(state.question);
      setEditStateExpectedInputs(state.expectedInputs || '');
      setEditStateExpectedKeywords(state.expectedKeywords || '');
      setStateBeingEdited(stateId);
    }
  };
  
  // Add a handler to delete a transition
  const handleDeleteTransition = (stateId: string, transitionIndex: number) => {
    setFormData(prev => {
      const stateDefinitions = { ...prev.stateDefinitions };
      const state = { ...stateDefinitions[stateId] };
      
      // Filter out the transition at the specified index
      state.transitions = state.transitions.filter((_, index) => index !== transitionIndex);
      
      stateDefinitions[stateId] = state;
      
      return {
        ...prev,
        stateDefinitions
      };
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation for required fields
    if (!formData.businessName || !formData.businessType || !formData.useCase || !formData.agentRole) {
      alert('Please fill in all required fields in the Basic Info tab');
      setCurrentTab('basic');
      return;
    }
    
    // Make sure we have at least one state or the end conversation state
    const stateCount = Object.keys(formData.stateDefinitions || {}).length;
    if (stateCount === 0) {
      alert('Please define at least one conversation state or add an End Conversation state');
      setCurrentTab('states');
      return;
    }
    
    // Check if there's only an end conversation state with no other states
    const hasOnlyEndState = stateCount === 1 && formData.stateDefinitions?.['end_conversation'];
    if (hasOnlyEndState) {
      alert('Please define at least one regular conversation state besides the End Conversation state');
      setCurrentTab('states');
      setShowAddStateForm(true);
      return;
    }
    
    // Ensure there's a greeting state if not already present
    ensureGreetingState();
    
    // Enable the metrics tab after agent generation
    setShowMetricsTab(true);
    
    // Submit the form
    onSubmit(formData as Business);
    
    // Switch to metrics tab automatically
    setCurrentTab('metrics');
  };
  
  // Helper to ensure we have a greeting state
  const ensureGreetingState = () => {
    const stateDefinitions = formData.stateDefinitions || {};
    const hasGreetingState = Object.values(stateDefinitions).some(
      state => state.id === 'greeting' || state.name.toLowerCase().includes('greeting')
    );
    
    // If no greeting state exists and there are no states, create one
    if (!hasGreetingState && Object.keys(stateDefinitions).length === 0) {
      const greetingState: ConversationState = {
        id: 'greeting',
        name: 'Greeting',
        question: `Hello! This is ${formData.businessName}'s ${formData.agentRole}. How can I assist you today?`,
        expectedInputs: 'Any',
        expectedKeywords: '(none)',
        transitions: []
      };
      
      setFormData(prev => ({
        ...prev,
        initialState: 'greeting',
        stateDefinitions: {
          ...prev.stateDefinitions,
          'greeting': greetingState
        }
      }));
    }
  };
  
  // Handle end conversation option
  const handleAddEndConversation = () => {
    // Hide the add state form when adding end conversation
    setShowAddStateForm(false);
    
    // Create an end conversation state if it doesn't exist
    const endStateId = 'end_conversation';
    
    if (!formData.stateDefinitions?.[endStateId]) {
      const endState: ConversationState = {
        id: endStateId,
        name: 'End Conversation',
        question: 'Thank you for your time. Is there anything else I can help you with?',
        expectedInputs: 'Yes/No response',
        expectedKeywords: 'no, thanks, goodbye, bye, that\'s all',
        transitions: []
      };
      
      // Now add the end conversation state
      setFormData(prev => ({
        ...prev,
        stateDefinitions: {
          ...prev.stateDefinitions,
          [endStateId]: endState
        }
      }));
      
      // Update transitions in other states to include this end state
      // For each state, add a transition to the end state with appropriate conditions
      const updatedStateDefinitions = { ...formData.stateDefinitions };
      
      Object.keys(updatedStateDefinitions).forEach(stateId => {
        // Don't add the transition to the end state itself
        if (stateId !== endStateId) {
          const state = { ...updatedStateDefinitions[stateId] };
          
          // Check if there's already a transition to the end state
          const hasEndTransition = state.transitions.some(t => t.targetState === endStateId);
          
          if (!hasEndTransition) {
            // Add a transition to the end state
            state.transitions = [
              ...state.transitions,
              {
                condition: 'goodbye, bye, exit, quit, end, done, that\'s all',
                targetState: endStateId
              }
            ];
            
            updatedStateDefinitions[stateId] = state;
          }
        }
      });
      
      // Update form data with the updated state definitions
      setFormData(prev => ({
        ...prev,
        stateDefinitions: updatedStateDefinitions
      }));
      
      // Show success message
      alert('End Conversation state added successfully! You can now generate your agent.');
    } else {
      // If end conversation state already exists
      alert('End Conversation state already exists. You can now generate your agent.');
    }
  };
  
  // Add conversation edit option  
  const handleEditConversationFlow = () => {
    // Show the add state form when editing conversation flow
    setShowAddStateForm(true);
    setCurrentTab('states');
  };

  // Render conversation states tab content
  const renderStatesTab = () => {
    // Get all states
    const states = formData.stateDefinitions || {};
    const stateIds = Object.keys(states);
    
    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Conversation States</h3>
          <p className="text-sm text-gray-600 mb-4">
            Define the states in your conversation flow. Each state has a question, expected inputs, and transitions to other states.
          </p>
          
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={handleEditConversationFlow}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Conversation Flow
            </button>
            
            <button
              type="button"
              onClick={handleAddEndConversation}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Add End Conversation State
            </button>
          </div>
          
          {/* State list */}
          <div className="space-y-4 mb-8">
            {stateIds.length > 0 ? (
              stateIds.map(stateId => {
                const state = states[stateId];
                const isBeingEdited = stateBeingEdited === stateId;
                const isInitialState = formData.initialState === stateId;
                
                return (
                  <div key={stateId} 
                    className={`border rounded-lg overflow-hidden ${
                      isInitialState ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center space-x-2">
                        {isInitialState && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            Initial State
                          </span>
                        )}
                        <h4 className="font-medium text-gray-900">
                          {state.name} <span className="text-gray-500 text-sm ml-1">({stateId})</span>
                        </h4>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditStateClick(stateId)}
                          className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteState(stateId)}
                          className="inline-flex items-center p-1.5 border border-red-300 rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {isBeingEdited ? (
                      /* Edit state form */
                      <div className="p-4 bg-white">
                        <div className="space-y-4">
                          <div>
                            <label htmlFor={`edit-state-name-${stateId}`} className="block text-sm font-medium text-gray-700 mb-1">State Name</label>
                            <input
                              type="text"
                              id={`edit-state-name-${stateId}`}
                              value={editStateName}
                              onChange={(e) => setEditStateName(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor={`edit-state-question-${stateId}`} className="block text-sm font-medium text-gray-700 mb-1">Question/Prompt</label>
                            <textarea
                              id={`edit-state-question-${stateId}`}
                              value={editStateQuestion}
                              onChange={(e) => setEditStateQuestion(e.target.value)}
                              rows={2}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor={`edit-state-inputs-${stateId}`} className="block text-sm font-medium text-gray-700 mb-1">Expected Inputs</label>
                            <input
                              type="text"
                              id={`edit-state-inputs-${stateId}`}
                              value={editStateExpectedInputs}
                              onChange={(e) => setEditStateExpectedInputs(e.target.value)}
                              placeholder="e.g., Any, Yes/No, Phone Number, Name, etc."
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Type of input expected from user (e.g., "Any", "Yes/No", "Name", "Phone Number")
                            </p>
                          </div>
                          
                          <div>
                            <label htmlFor={`edit-state-keywords-${stateId}`} className="block text-sm font-medium text-gray-700 mb-1">Expected Keywords</label>
                            <input
                              type="text"
                              id={`edit-state-keywords-${stateId}`}
                              value={editStateExpectedKeywords}
                              onChange={(e) => setEditStateExpectedKeywords(e.target.value)}
                              placeholder="e.g., yes, no, maybe, (none), Any"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Specific keywords to look for. Use "(none)" if no keywords are expected.
                            </p>
                          </div>
                          
                          <div className="flex justify-end space-x-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setStateBeingEdited(null)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateState(stateId)}
                              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* View state details */
                      <div className="p-4 bg-white">
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700">Question/Prompt:</h5>
                            <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{state.question}</p>
                          </div>
                          
                          {state.expectedInputs && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700">Expected Inputs:</h5>
                              <p className="mt-1 text-sm text-gray-900">{state.expectedInputs}</p>
                            </div>
                          )}
                          
                          {state.expectedKeywords && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700">Expected Keywords:</h5>
                              <p className="mt-1 text-sm text-gray-900">{state.expectedKeywords}</p>
                            </div>
                          )}
                          
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Transitions:</h5>
                            {state.transitions.length > 0 ? (
                              <ul className="space-y-2">
                                {state.transitions.map((transition, index) => (
                                  <li key={index} className="flex justify-between items-center p-2 text-sm bg-gray-50 rounded border border-gray-200">
                                    <div>
                                      <span className="font-medium">If response:</span> {transition.condition}
                                      <span className="mx-2 text-gray-400">→</span>
                                      <span className="font-medium">Go to:</span> {transition.targetState}
                                      {formData.stateDefinitions?.[transition.targetState]?.name && (
                                        <span className="text-gray-500 ml-1">
                                          ({formData.stateDefinitions[transition.targetState].name})
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransition(stateId, index)}
                                      className="p-1 text-red-600 hover:text-red-900 focus:outline-none"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500 italic">No transitions defined for this state.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">No states defined yet. Add your first state below.</p>
              </div>
            )}
          </div>
          
          {/* Add state form */}
          {showAddStateForm && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New State</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-state-id" className="block text-sm font-medium text-gray-700 mb-1">State ID</label>
                    <input
                      type="text"
                      id="new-state-id"
                      value={newStateId}
                      onChange={(e) => setNewStateId(e.target.value)}
                      placeholder="e.g., ask_name, confirm_order"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      A unique identifier for this state (no spaces, use underscores)
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="new-state-name" className="block text-sm font-medium text-gray-700 mb-1">State Name</label>
                    <input
                      type="text"
                      id="new-state-name"
                      value={newStateName}
                      onChange={(e) => setNewStateName(e.target.value)}
                      placeholder="e.g., Ask for Name, Confirm Order"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      A human-readable name for this state
                    </p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="new-state-question" className="block text-sm font-medium text-gray-700 mb-1">Question/Prompt</label>
                  <textarea
                    id="new-state-question"
                    value={newStateQuestion}
                    onChange={(e) => setNewStateQuestion(e.target.value)}
                    placeholder="e.g., Can I get your name please?"
                    rows={2}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The question or prompt that the agent will say in this state
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-state-expected-inputs" className="block text-sm font-medium text-gray-700 mb-1">Expected Inputs</label>
                    <input
                      type="text"
                      id="new-state-expected-inputs"
                      value={newStateExpectedInputs}
                      onChange={(e) => setNewStateExpectedInputs(e.target.value)}
                      placeholder="e.g., Any, Yes/No, Phone Number, Name"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Type of input expected from user (e.g., "Any", "Yes/No", "Name")
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="new-state-expected-keywords" className="block text-sm font-medium text-gray-700 mb-1">Expected Keywords</label>
                    <input
                      type="text"
                      id="new-state-expected-keywords"
                      value={newStateExpectedKeywords}
                      onChange={(e) => setNewStateExpectedKeywords(e.target.value)}
                      placeholder="e.g., yes, no, maybe, (none), Any"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Keywords to look for. Use "(none)" if no keywords are expected.
                    </p>
                  </div>
                </div>
                
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleAddState}
                    disabled={!newStateId || !newStateName || !newStateQuestion}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add State
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Add transitions section */}
        {stateIds.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Transitions Between States</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
              <div className="md:col-span-4">
                <label htmlFor="transition-from-state" className="block text-sm font-medium text-gray-700 mb-1">From State</label>
                <select
                  id="transition-from-state"
                  name="transition-from-state"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Select a state</option>
                  {stateIds.map(id => (
                    <option key={id} value={id}>
                      {states[id].name} ({id})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-4">
                <label htmlFor="transition-condition" className="block text-sm font-medium text-gray-700 mb-1">If User Response</label>
                <input
                  type="text"
                  id="transition-condition"
                  name="transition-condition"
                  placeholder="e.g., yes, any, contains:order"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="md:col-span-4">
                <label htmlFor="transition-to-state" className="block text-sm font-medium text-gray-700 mb-1">To State</label>
                <select
                  id="transition-to-state"
                  name="transition-to-state"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Select a state</option>
                  {stateIds.map(id => (
                    <option key={id} value={id}>
                      {states[id].name} ({id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const fromState = (document.getElementById('transition-from-state') as HTMLSelectElement).value;
                const condition = (document.getElementById('transition-condition') as HTMLInputElement).value;
                const toState = (document.getElementById('transition-to-state') as HTMLSelectElement).value;
                
                if (fromState && condition && toState) {
                  handleAddTransition(fromState, condition, toState);
                  
                  // Clear the form
                  (document.getElementById('transition-condition') as HTMLInputElement).value = '';
                }
              }}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Transition
            </button>
          </div>
        )}
      </div>
    );
  };

  // Add function to handle adding a knowledge base item
  const handleAddKnowledgeItem = () => {
    if (!newQuestionPattern || !newQuestionAnswer) return;
    
    // Process for pattern matching - add alternate forms, make it more flexible
    const enhancedPattern = enhanceQuestionPattern(newQuestionPattern);
    
    setKnowledgeBaseItems(prev => [
      ...prev,
      {
        pattern: enhancedPattern,
        response: newQuestionAnswer
      }
    ]);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      knowledgeBase: [
        ...(prev.knowledgeBase || []),
        {
          pattern: enhancedPattern,
          response: newQuestionAnswer
        }
      ]
    }));
    
    // Reset fields
    setNewQuestionPattern('');
    setNewQuestionAnswer('');
  };

  // Add function to enhance question patterns with variations
  const enhanceQuestionPattern = (pattern: string): string => {
    // Don't modify if it already contains special pattern syntax
    if (pattern.includes('|') || pattern.includes('*') || pattern.includes('+')) {
      return pattern;
    }
    
    // Common question prefixes to handle variations
    const questionPrefixes = [
      'where', 'what', 'when', 'who', 'why', 'how',
      'can you', 'could you', 'would you', 'do you',
      'is there', 'are there', 'tell me'
    ];
    
    // Extract the core concept of the question
    let coreConcept = pattern.toLowerCase();
    
    questionPrefixes.forEach(prefix => {
      if (coreConcept.startsWith(prefix)) {
        coreConcept = coreConcept.substring(prefix.length).trim();
        
        // Remove question marks and common words
        coreConcept = coreConcept.replace(/\?/g, '')
          .replace(/^(about|the|your|a|an)/g, '')
          .trim();
      }
    });
    
    // If we have a core concept, create a flexible pattern
    if (coreConcept) {
      return `(${questionPrefixes.join('|')})?.*(${coreConcept})`;
    }
    
    // If no clear pattern can be extracted, return the original
    return pattern;
  };

  // Add function to edit a knowledge base item
  const handleEditKnowledgeItem = (index: number) => {
    const item = knowledgeBaseItems[index];
    setEditKnowledgePattern(item.pattern);
    setEditKnowledgeResponse(item.response);
    setEditingKnowledgeItemIndex(index);
  };

  // Add function to update a knowledge base item
  const handleUpdateKnowledgeItem = (index: number) => {
    if (!editKnowledgePattern || !editKnowledgeResponse) return;
    
    // Process for pattern matching
    const enhancedPattern = enhanceQuestionPattern(editKnowledgePattern);
    
    const updatedItems = [...knowledgeBaseItems];
    updatedItems[index] = {
      pattern: enhancedPattern,
      response: editKnowledgeResponse
    };
    
    setKnowledgeBaseItems(updatedItems);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      knowledgeBase: updatedItems
    }));
    
    // Reset editing state
    setEditingKnowledgeItemIndex(null);
    setEditKnowledgePattern('');
    setEditKnowledgeResponse('');
  };

  // Add function to delete a knowledge base item
  const handleDeleteKnowledgeItem = (index: number) => {
    if (!window.confirm("Are you sure you want to delete this knowledge item?")) {
      return;
    }
    
    const updatedItems = knowledgeBaseItems.filter((_, i) => i !== index);
    setKnowledgeBaseItems(updatedItems);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      knowledgeBase: updatedItems
    }));
    
    // Clear editing state if this item was being edited
    if (editingKnowledgeItemIndex === index) {
      setEditingKnowledgeItemIndex(null);
      setEditKnowledgePattern('');
      setEditKnowledgeResponse('');
    }
  };

  // Initialize the knowledge base from initial config if available
  useEffect(() => {
    if (initialConfig?.knowledgeBase) {
      setKnowledgeBaseItems(initialConfig.knowledgeBase);
    }
  }, [initialConfig]);

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 border border-indigo-100 backdrop-blur-sm bg-opacity-80">
      <h2 className="text-xl font-semibold mb-6 text-indigo-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Agent Configuration
      </h2>
      
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex flex-wrap -mb-px space-x-4 md:space-x-8">
          <button
            className={`py-3 px-3 border-b-2 font-medium text-sm transition-all duration-200 ${
              currentTab === 'basic'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setCurrentTab('basic')}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Basic Info</span>
            </div>
          </button>
          <button
            className={`py-3 px-3 border-b-2 font-medium text-sm transition-all duration-200 ${
              currentTab === 'states'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setCurrentTab('states')}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Conversation Flow</span>
            </div>
          </button>
          <button
            className={`py-3 px-3 border-b-2 font-medium text-sm transition-all duration-200 ${
              currentTab === 'rules'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setCurrentTab('rules')}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Disqualification Rules</span>
            </div>
          </button>
          {showMetricsTab && (
            <button
              className={`py-3 px-3 border-b-2 font-medium text-sm transition-all duration-200 ${
                currentTab === 'metrics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setCurrentTab('metrics')}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Metrics & Analysis</span>
              </div>
            </button>
          )}
          <button
            className={`py-3 px-3 border-b-2 font-medium text-sm transition-all duration-200 ${
              currentTab === 'knowledge'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setCurrentTab('knowledge')}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Knowledge Base</span>
            </div>
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {currentTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Business Information</h3>
              <p className="text-sm text-gray-600 mb-4">
                Provide basic information about your business and use case for the AI agent.
              </p>
              
              <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name*
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    id="businessName"
                    value={formData.businessName || ''}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type*
                  </label>
                  <input
                    type="text"
                    name="businessType"
                    id="businessType"
                    value={formData.businessType || ''}
                    onChange={handleChange}
                    placeholder="e.g., SaaS, Retail, Restaurant"
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 mb-1">
                  Use Case*
                </label>
                <input
                  type="text"
                  name="useCase"
                  id="useCase"
                  value={formData.useCase || ''}
                  onChange={handleChange}
                  placeholder="e.g., Customer Support, Lead Generation, Appointment Booking"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Agent Configuration</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure how your AI agent should behave and communicate.
              </p>
              
              <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="agentRole" className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Role*
                  </label>
                  <input
                    type="text"
                    name="agentRole"
                    id="agentRole"
                    value={formData.agentRole || ''}
                    onChange={handleChange}
                    placeholder="e.g., Sales Representative, Customer Support Agent"
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="tonePreference" className="block text-sm font-medium text-gray-700 mb-1">
                    Tone Preference
                  </label>
                  <select
                    name="tonePreference"
                    id="tonePreference"
                    value={formData.tonePreference || 'professional'}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Conversation States Tab */}
        {currentTab === 'states' && renderStatesTab()}
        
        {/* Rules & Actions Tab */}
        {currentTab === 'rules' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Disqualification Rules</h3>
            
            {/* Disqualification Rules List */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Defined Rules</h4>
              
              {(formData.disqualificationRules || []).length === 0 ? (
                <div className="text-gray-500 italic">No disqualification rules defined yet. Add a rule below.</div>
              ) : (
                <div className="space-y-2">
                  {(formData.disqualificationRules || []).map((rule, index) => (
                    <div key={index} className="border rounded-md p-3">
                      {ruleBeingEdited === index ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Condition <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={editRuleCondition}
                              onChange={(e) => setEditRuleCondition(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Message <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={editRuleMessage}
                              onChange={(e) => setEditRuleMessage(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setRuleBeingEdited(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateRule(index)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-md"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex justify-between items-center">
                            <h5 className="font-medium">Rule #{index + 1}</h5>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleEditRule(index)}
                                className="p-1 text-indigo-600 hover:text-indigo-800"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(index)}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="mt-2"><strong>Condition:</strong> {rule.condition}</p>
                          <p className="mt-1"><strong>Message:</strong> {rule.message}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Add New Rule Form */}
            <div className="border rounded-md p-4 bg-gray-50 mb-6">
              <h4 className="font-medium mb-3">Add New Disqualification Rule</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Condition <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="new-rule-condition"
                    placeholder="e.g., contains:cancel order, repetitive phrases like 'ok ok ok'"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The system will automatically detect repetitive patterns like "ok ok ok" and handle them intelligently.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="new-rule-message"
                    placeholder="Message to display when this rule is triggered"
                    className="w-full px-3 py-2 border rounded-md"
                    rows={2}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const conditionEl = document.getElementById('new-rule-condition') as HTMLInputElement;
                      const messageEl = document.getElementById('new-rule-message') as HTMLTextAreaElement;
                      
                      if (conditionEl && messageEl && conditionEl.value && messageEl.value) {
                        handleAddDisqualificationRule(
                          conditionEl.value,
                          messageEl.value
                        );
                        
                        // Reset fields
                        conditionEl.value = '';
                        messageEl.value = '';
                      }
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-4">Completion Actions</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Webhook URL
                </label>
                <input
                  type="text"
                  name="webhookUrl"
                  value={formData.completionActions?.webhook || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      completionActions: {
                        ...prev.completionActions,
                        webhook: e.target.value
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., https://yourbusiness.com/webhook"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Notification Email
                </label>
                <input
                  type="email"
                  name="notificationEmail"
                  value={formData.completionActions?.email || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      completionActions: {
                        ...prev.completionActions,
                        email: e.target.value
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., notifications@yourbusiness.com"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyHuman"
                  checked={formData.completionActions?.notifyHuman || false}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      completionActions: {
                        ...prev.completionActions,
                        notifyHuman: e.target.checked
                      }
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notifyHuman" className="ml-2 block text-sm text-gray-700">
                  Notify human agent for follow-up
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* Metrics Tab */}
        {currentTab === 'metrics' && (
          <div className="bg-white p-6 rounded-xl shadow-inner border border-gray-200">
            <h3 className="text-lg font-medium mb-6 text-indigo-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Token Usage & Memory Metrics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OpenAI Token Usage Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  OpenAI Token Usage
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Tokens Used:</span>
                    <span className="font-medium">{metricsData.tokenUsage.totalTokens}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Input Tokens:</span>
                    <span className="font-medium">{metricsData.tokenUsage.inputTokens}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Output Tokens:</span>
                    <span className="font-medium">{metricsData.tokenUsage.outputTokens}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Estimated Cost:</span>
                    <span className="font-medium">{metricsData.tokenUsage.estimatedCost}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <div className="text-sm text-blue-700">
                      {Number(metricsData.tokenUsage.totalTokens.replace(/,/g, '')) > 0 
                        ? "Token usage is being tracked in real-time as you use the agent." 
                        : "Token usage will be displayed here once the conversation begins."}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Kani Memory Usage Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-100 shadow-sm">
                <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Kani Memory Usage
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current States:</span>
                    <span className="font-medium">{Object.keys(formData.stateDefinitions || {}).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Transitions:</span>
                    <span className="font-medium">{metricsData.conversationStats.transitions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Memory Efficiency:</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-purple-600 h-2.5 rounded-full" 
                          style={{ 
                            width: metricsData.conversationStats.tokenSavings === '0%' 
                              ? '100%' 
                              : metricsData.conversationStats.tokenSavings
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{metricsData.conversationStats.tokenSavings}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-100">
                    <div className="text-sm text-purple-700">
                      {metricsData.conversationStats.messageCount > 0 
                        ? "Kani memory metrics are updating as you use the conversation agent."
                        : "Kani memory metrics will update as you use the conversation agent."}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Conversation Analytics Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-100 shadow-sm col-span-1 md:col-span-2">
                <h4 className="font-medium text-green-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Conversation Analytics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                    <div className="text-green-800 font-medium mb-1">Messages</div>
                    <div className="text-3xl font-bold text-gray-800">{metricsData.conversationStats.messageCount}</div>
                    <div className="text-sm text-gray-500 mt-1">Total exchanges</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                    <div className="text-green-800 font-medium mb-1">Success Rate</div>
                    <div className="text-3xl font-bold text-gray-800">{metricsData.conversationStats.successRate}</div>
                    <div className="text-sm text-gray-500 mt-1">Response rate</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                    <div className="text-green-800 font-medium mb-1">Avg. Response</div>
                    <div className="text-3xl font-bold text-gray-800">{metricsData.conversationStats.avgResponseTime}</div>
                    <div className="text-sm text-gray-500 mt-1">Response time</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-center text-green-700">
                  {metricsData.conversationStats.messageCount > 0 
                    ? "Analytics are being updated in real-time during the conversation."
                    : "Analytics will be updated in real-time during the conversation."}
                </div>
              </div>
            </div>
            
            {/* Token Savings Information */}
            <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100">
              <h4 className="font-medium text-indigo-800 mb-2">About Kani Memory Management</h4>
              <p className="text-sm text-gray-700">
                Kani memory management helps reduce token usage by using rule-based responses when possible and only using the LLM when needed. This hybrid approach can result in significant cost savings while maintaining high-quality responses.
              </p>
              <div className="mt-3 flex items-center">
                <div className="text-xs text-indigo-700 font-medium">Estimated Token Savings:</div>
                <div className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                  {metricsData.conversationStats.tokenSavings === '0%' 
                    ? '0% (Baseline)' 
                    : metricsData.conversationStats.tokenSavings}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Knowledge Base Tab */}
        {currentTab === 'knowledge' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Knowledge Base</h3>
            <p className="text-sm text-gray-600 mb-4">
              Define common questions and answers that the voice agent should know, regardless of conversation state.
              The system will automatically recognize similar questions asked in different ways.
            </p>
            
            {/* Knowledge Base Items List */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Defined Questions & Answers</h4>
              
              {knowledgeBaseItems.length === 0 ? (
                <div className="text-gray-500 italic">No knowledge base items defined yet. Add common Q&A pairs below.</div>
              ) : (
                <div className="space-y-3">
                  {knowledgeBaseItems.map((item, index) => (
                    <div key={index} className="border rounded-md p-3">
                      {editingKnowledgeItemIndex === index ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Question Pattern <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={editKnowledgePattern}
                              onChange={(e) => setEditKnowledgePattern(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md"
                              placeholder="e.g., Where are you located?"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Answer <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={editKnowledgeResponse}
                              onChange={(e) => setEditKnowledgeResponse(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              placeholder="Our office is located in New York City."
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingKnowledgeItemIndex(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateKnowledgeItem(index)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-md"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex justify-between items-center">
                            <h5 className="font-medium">Q&A #{index + 1}</h5>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleEditKnowledgeItem(index)}
                                className="p-1 text-indigo-600 hover:text-indigo-800"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteKnowledgeItem(index)}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                            <p className="text-sm font-medium text-gray-700">Question Pattern:</p>
                            <p className="text-sm text-gray-900">{item.pattern}</p>
                          </div>
                          <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                            <p className="text-sm font-medium text-gray-700">Answer:</p>
                            <p className="text-sm text-gray-900">{item.response}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Add New Knowledge Item Form */}
            <div className="border rounded-md p-4 bg-gray-50 mb-6">
              <h4 className="font-medium mb-3">Add New Q&A Pair</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Question Pattern <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newQuestionPattern}
                    onChange={(e) => setNewQuestionPattern(e.target.value)}
                    placeholder="e.g., Where are you located?"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The system will automatically recognize similar phrasings of the same question.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Answer <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newQuestionAnswer}
                    onChange={(e) => setNewQuestionAnswer(e.target.value)}
                    placeholder="Our office is located in New York City."
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddKnowledgeItem}
                    disabled={!newQuestionPattern || !newQuestionAnswer}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add to Knowledge Base
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="mt-8 flex justify-center">
          <button
            type="submit"
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            Generate Agent
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessConfigForm; 