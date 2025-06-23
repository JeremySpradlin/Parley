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

// Helper function to map word value to font size, with scaling
const fontScaleFactory = (maxValue: number) => (word: WordFrequency) => {
  if (maxValue === 0) return 14;
  // Scale between 14 and 50 px
  return 14 + (word.value / maxValue) * 36;
};

// Color palette for the words – chosen to stand out against dark bg
const colors = [
  '#c084fc', // purple-400
  '#8b5cf6', // purple-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#22d3ee', // sky-400
];

const getFill = (word: WordFrequency, index: number) => {
  // Choose color based on index for visual variety
  return colors[index % colors.length];
};

export function WordCloudComponent({ words }: WordCloudComponentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const processedWords = useMemo(() => {
    if (!words || words.length === 0) return [];
    return words.slice(0, 50);
  }, [words]);

  const fontScale = useMemo(() => {
    const maxVal = processedWords.length ? Math.max(...processedWords.map(w => w.value)) : 0;
    return fontScaleFactory(maxVal);
  }, [processedWords]);

  // Debug logging
  useEffect(() => {
    console.log('WordCloudComponent - processedWords:', processedWords);
  }, [processedWords]);

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

  // Create an enhanced word visualization that works reliably
  return (
    <div className="h-64 w-full overflow-hidden rounded-lg bg-gray-900/20 p-4">
      <div className="h-full overflow-y-auto">
        <div className="flex flex-wrap gap-2 justify-center items-center">
          {processedWords.map((word, index) => {
            const maxValue = Math.max(...processedWords.map(w => w.value));
            const normalizedSize = word.value / maxValue;
            const fontSize = Math.floor(14 + normalizedSize * 24); // 14px to 38px
            const opacity = 0.6 + normalizedSize * 0.4; // 0.6 to 1.0
            
            return (
              <span
                key={`${word.text}-${index}`}
                className="inline-block px-3 py-1 rounded-lg transition-all duration-200 hover:scale-110 cursor-default"
                style={{
                  fontSize: `${fontSize}px`,
                  color: colors[index % colors.length],
                  opacity,
                  backgroundColor: 'rgba(107, 114, 128, 0.1)',
                  border: `1px solid ${colors[index % colors.length]}20`,
                  transform: index % 3 === 0 ? 'rotate(-2deg)' : index % 3 === 1 ? 'rotate(2deg)' : 'rotate(0deg)',
                }}
                title={`${word.text}: ${word.value} occurrences`}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}