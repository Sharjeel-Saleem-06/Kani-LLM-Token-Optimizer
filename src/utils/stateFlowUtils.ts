/**
 * Utilities for working with conversation state flows and visualizations
 */
import { Business, ConversationState } from '../models/types';

/**
 * Generate data for visualization of the state flow
 */
export function generateStateFlowData(business: Business) {
  const { stateDefinitions } = business;
  
  // Create nodes from state definitions
  const nodes = Object.entries(stateDefinitions).map(([id, state]) => ({
    id,
    data: {
      label: state.name,
      question: state.question,
      isTerminal: state.isTerminal || false,
      isInitial: id === business.initialState
    },
    position: { x: 0, y: 0 } // Position will be calculated by the layout algorithm
  }));
  
  // Create edges from transitions
  const edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string;
  }> = [];
  
  Object.entries(stateDefinitions).forEach(([sourceId, state]) => {
    state.transitions.forEach((transition, index) => {
      edges.push({
        id: `${sourceId}-${transition.targetState}-${index}`,
        source: sourceId,
        target: transition.targetState,
        label: transition.condition
      });
    });
  });
  
  return { nodes, edges };
}

/**
 * Validate a state flow for potential issues
 */
export function validateStateFlow(business: Business): Array<{ severity: 'error' | 'warning'; message: string }> {
  const { stateDefinitions, initialState } = business;
  const issues: Array<{ severity: 'error' | 'warning'; message: string }> = [];
  
  // Check if initial state exists
  if (!initialState) {
    issues.push({
      severity: 'error',
      message: 'No initial state defined'
    });
  } else if (!stateDefinitions[initialState]) {
    issues.push({
      severity: 'error',
      message: `Initial state "${initialState}" is not defined in state definitions`
    });
  }
  
  // Check for states with no transitions
  Object.entries(stateDefinitions).forEach(([id, state]) => {
    if (state.transitions.length === 0 && !state.isTerminal) {
      issues.push({
        severity: 'warning',
        message: `State "${state.name}" (${id}) has no transitions and is not marked as terminal`
      });
    }
  });
  
  // Check for transitions to non-existent states
  Object.entries(stateDefinitions).forEach(([id, state]) => {
    state.transitions.forEach(transition => {
      if (!stateDefinitions[transition.targetState]) {
        issues.push({
          severity: 'error',
          message: `State "${state.name}" (${id}) has a transition to non-existent state "${transition.targetState}"`
        });
      }
    });
  });
  
  // Check for unreachable states
  const reachableStates = findReachableStates(stateDefinitions, initialState);
  Object.entries(stateDefinitions).forEach(([id, state]) => {
    if (!reachableStates.has(id)) {
      issues.push({
        severity: 'warning',
        message: `State "${state.name}" (${id}) is not reachable from the initial state`
      });
    }
  });
  
  return issues;
}

/**
 * Find all states that are reachable from the initial state
 */
function findReachableStates(
  stateDefinitions: Record<string, ConversationState>,
  initialState: string
): Set<string> {
  const reachable = new Set<string>();
  
  const traverse = (stateId: string) => {
    if (reachable.has(stateId) || !stateDefinitions[stateId]) {
      return;
    }
    
    reachable.add(stateId);
    
    const state = stateDefinitions[stateId];
    state.transitions.forEach(transition => {
      traverse(transition.targetState);
    });
  };
  
  traverse(initialState);
  
  return reachable;
}

/**
 * Generate a textual description of the conversation flow
 */
export function generateFlowDescription(business: Business): string {
  const { stateDefinitions, initialState } = business;
  
  const lines: string[] = [
    `Conversation Flow for ${business.businessName}`,
    `======================================`,
    ``,
    `Initial State: ${initialState} - ${stateDefinitions[initialState]?.name || 'Unknown'}`,
    ``
  ];
  
  Object.entries(stateDefinitions).forEach(([id, state]) => {
    lines.push(`State: ${state.name} (${id})`);
    lines.push(`Question: "${state.question}"`);
    
    if (state.transitions.length === 0) {
      lines.push(`Transitions: None (Terminal State)`);
    } else {
      lines.push(`Transitions:`);
      state.transitions.forEach(transition => {
        lines.push(`  - If "${transition.condition}" → ${transition.targetState} (${stateDefinitions[transition.targetState]?.name || 'Unknown'})`);
      });
    }
    
    lines.push(``);
  });
  
  return lines.join('\n');
} 