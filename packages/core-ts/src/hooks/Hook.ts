/**
 * Represents a named text region that can be dynamically modified
 */
export interface Hook {
  /** Unique identifier: {passageId}_{hookName} */
  id: string
  
  /** Hook name as defined in passage */
  name: string
  
  /** Original content from definition */
  content: string
  
  /** Current content after modifications */
  currentContent: string
  
  /** Whether hook is visible (show/hide) */
  visible: boolean
  
  /** Parent passage identifier */
  passageId: string
  
  /** Timestamp of hook creation */
  createdAt: number
  
  /** Number of modifications applied */
  modifiedCount: number
}
