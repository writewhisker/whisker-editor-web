/**
 * Passage Editor Component
 */

import { useState, useCallback } from 'react';
import type { Passage } from '@writewhisker/story-models';

export interface PassageEditorProps {
  passage: Passage;
  onChange?: (passage: Passage) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function PassageEditor({ passage: initialPassage, onChange, className, style }: PassageEditorProps) {
  const [passage, setPassage] = useState<Passage>(initialPassage);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...passage, title: e.target.value };
    setPassage(updated);
    onChange?.(updated);
  }, [passage, onChange]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = { ...passage, content: e.target.value };
    setPassage(updated);
    onChange?.(updated);
  }, [passage, onChange]);

  return (
    <div className={className} style={{ fontFamily: 'system-ui, sans-serif', ...style }}>
      <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, color: '#333' }}>
            Title
          </label>
          <input
            type="text"
            value={passage.title}
            onChange={handleTitleChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, color: '#333' }}>
            Content
          </label>
          <textarea
            value={passage.content}
            onChange={handleContentChange}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>
      </div>
    </div>
  );
}
