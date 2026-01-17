// Custom event for triggering command search
export const COMMAND_SEARCH_EVENT = 'openGlobalCommandSearch';

// Simple event-based trigger - call this from anywhere to open the command search
export const openGlobalCommandSearch = () => {
  window.dispatchEvent(new CustomEvent(COMMAND_SEARCH_EVENT));
};
