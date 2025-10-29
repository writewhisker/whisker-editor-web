/**
 * Mock implementation of Monaco Editor for testing
 */

export const editor = {
  create: () => ({
    getValue: () => '',
    setValue: () => {},
    getModel: () => null,
    getPosition: () => null,
    setPosition: () => {},
    getSelection: () => null,
    updateOptions: () => {},
    onDidChangeModelContent: () => ({ dispose: () => {} }),
    layout: () => {},
    focus: () => {},
    executeEdits: () => {},
    getAction: () => ({ run: () => {} }),
    dispose: () => {},
  }),
  setModelLanguage: () => {},
  setTheme: () => {},
  defineTheme: () => {},
};

export const languages = {
  register: () => {},
  setLanguageConfiguration: () => {},
  setMonarchTokensProvider: () => {},
  registerCompletionItemProvider: () => {},
  CompletionItemKind: {
    Function: 1,
    Property: 10,
  },
  CompletionItemInsertTextRule: {
    InsertAsSnippet: 4,
  },
};
