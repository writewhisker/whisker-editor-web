/**
 * Authentication Service Exports
 */

export {
  // Stores
  currentUser,
  isAuthenticated,
  isAnonymous,
  hasGitHubConnected,
  authState,

  // Functions
  initializeAuth,
  switchToAnonymous,
  connectGitHub,
  handleGitHubConnection,
  disconnectGitHub,
  signOut,
  deleteAccount,
  getCurrentUser,
  checkAuthenticated,
  checkIsAnonymous,
  checkHasGitHub,

  // Types
  type User,
  type AuthProvider,
  type AuthState,
} from './AuthService';
