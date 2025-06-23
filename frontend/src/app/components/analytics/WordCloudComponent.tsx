'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '../ErrorBoundary';

interface WordFrequency {
  text: string;
  value: number;
}

interface WordCloudComponentProps {
  words: WordFrequency[];
}

// Fallback component for when the word cloud fails to load or render
const WordListFallback = ({ words }: { words: WordFrequency[] }) => (
  <div className="h-64 overflow-y-auto p-4">
    <div className="text-center text-gray-400 mb-4">
      <p className="mb-4">Word cloud unavailable - showing word list instead.</p>
    </div>
    <div className="flex flex-wrap gap-2 justify-center">
      {words.slice(0, 50).map((word, index) => (
        <span
          key={`${word.text}-${index}`}
          className="bg-gray-700/50 px-2 py-1 rounded text-xs text-gray-300"
        >
          {word.text} ({word.value})
        </span>
      ))}
    </div>
  </div>
);

// Dynamically import the new word cloud component
const D3WordCloud = dynamic(() => import('react-d3-cloud'), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-gray-400">
      Loading word cloud...
    </div>
  ),
});

// Helper function to provide a deterministic rotation angle
const rotate = () => (Math.random() > 0.7 ? 90 : 0);

// Helper function to map word value to font size
const fontScale = (word: WordFrequency) => 8 + word.value * 2;


export function WordCloudComponent({ words }: WordCloudComponentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const processedWords = useMemo(() => {
    if (!words || words.length === 0) return [];
    return words.slice(0, 50);
  }, [words]);

  if (processedWords.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>No keyword data available</p>
      </div>
    );
  }

  // Render a placeholder or nothing until the component is mounted
  if (!isMounted) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        Initializing Word Cloud...
      </div>
    );
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg bg-gray-900/20 flex items-center justify-center">
      <ErrorBoundary fallback={<WordListFallback words={processedWords} />}>
        <D3WordCloud
          data={processedWords}
          width={400}
          height={250}
          font="Inter, sans-serif"
          fontSize={fontScale}
          rotate={rotate}
          padding={2}
        />
      </ErrorBoundary>
    </div>
  );
}