/**
 * Story Player Component
 */

import { useState, useCallback } from 'react';
import type { Story, Passage } from '@writewhisker/story-models';

export interface StoryPlayerProps {
  story: Story;
  onNavigate?: (passage: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function StoryPlayer({ story, onNavigate, className, style }: StoryPlayerProps) {
  const [currentPassage, setCurrentPassage] = useState<string>(story.startPassage || '');

  const navigateTo = useCallback((passageTitle: string) => {
    setCurrentPassage(passageTitle);
    onNavigate?.(passageTitle);
  }, [onNavigate]);

  const passage = story.findPassage((p) => p.title === currentPassage);

  if (!passage) {
    return <div className={className} style={style}>Passage not found: {currentPassage}</div>;
  }

  return (
    <div className={className} style={{ fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, ...style }}>
      <div style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#2c3e50' }}>
          {passage.title}
        </h2>
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
          <PassageContent content={passage.content} onNavigate={navigateTo} />
        </div>
      </div>
    </div>
  );
}

interface PassageContentProps {
  content: string;
  onNavigate: (passage: string) => void;
}

function PassageContent({ content, onNavigate }: PassageContentProps) {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Add link
    const text = match[2] ? match[1] : match[1];
    const target = match[2] || match[1];

    parts.push(
      <button
        key={match.index}
        onClick={() => onNavigate(target)}
        style={{
          display: 'inline-block',
          margin: '0.5rem 0.5rem 0.5rem 0',
          padding: '0.5rem 1rem',
          background: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2980b9')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#3498db')}
      >
        {text}
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts}</>;
}
