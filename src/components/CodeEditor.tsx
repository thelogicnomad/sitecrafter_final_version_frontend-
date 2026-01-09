import React, { useCallback, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { FileItem } from '../hooks/types';

interface CodeEditorProps {
  file: FileItem | null;
  onCodeChange?: (newContent: string) => void;
}

export function CodeEditor({ file, onCodeChange }: CodeEditorProps) {
  useEffect(() => {
    // Configure Monaco to disable TypeScript errors
    loader.init().then(monaco => {
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true
      });

      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true
      });
    });
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (onCodeChange && value !== undefined) {
      onCodeChange(value);
    }
  }, [onCodeChange]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Select a file to view and edit its contents
      </div>
    );
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'typescript';
    }
  };

  return (
    <Editor
      height="100%"
      defaultLanguage={getLanguage(file.name)}
      theme="vs-dark"
      value={file.content || ''}
      onChange={handleEditorChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}
