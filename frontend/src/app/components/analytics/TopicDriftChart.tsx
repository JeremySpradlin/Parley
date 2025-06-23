'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopicSegment {
  segment_index: number;
  start_message: number;
  end_message: number;
  dominant_topics: Array<{
    text: string;
    value: number;
  }>;
  topic_shift_score: number;
}

interface TopicDriftChartProps {
  data: TopicSegment[];
}

export function TopicDriftChart({ data }: TopicDriftChartProps) {
  const chartData = useMemo(() => {
    return data.map((segment, index) => ({
      segment: `Segment ${segment.segment_index + 1}`,
      shiftScore: Math.round(segment.topic_shift_score * 100), // Convert to percentage
      topics: segment.dominant_topics.slice(0, 3).map(t => t.text).join(', '),
      messageRange: `${segment.start_message + 1}-${segment.end_message + 1}`,
      topicCount: segment.dominant_topics.length
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg max-w-xs">
          <p className="text-gray-200 font-medium">{label}</p>
          <p className="text-sm text-gray-300">Messages: {data.messageRange}</p>
          <p className="text-sm text-blue-400">Topic Shift: {data.shiftScore}%</p>
          <p className="text-sm text-gray-300 mt-1">
            <span className="font-medium">Key Topics:</span>
          </p>
          <p className="text-sm text-gray-400">{data.topics}</p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>No topic drift data available</p>
      </div>
    );
  }

  // Color bars based on shift intensity
  const getBarColor = (shiftScore: number) => {
    if (shiftScore === 0) return '#6B7280'; // gray-500 - no shift
    if (shiftScore < 30) return '#10B981'; // green-500 - low shift
    if (shiftScore < 60) return '#F59E0B'; // amber-500 - medium shift
    return '#EF4444'; // red-500 - high shift
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="segment" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              label={{ value: 'Topic Shift %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="shiftScore" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.shiftScore)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Topic segments overview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Conversation Topics by Segment</h4>
        <div className="grid gap-2">
          {data.map((segment, index) => (
            <div 
              key={segment.segment_index}
              className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-200">
                  Segment {segment.segment_index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Messages {segment.start_message + 1}-{segment.end_message + 1}
                  </span>
                  {segment.topic_shift_score > 0 && (
                    <span 
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: `${getBarColor(segment.topic_shift_score * 100)}20`,
                        color: getBarColor(segment.topic_shift_score * 100)
                      }}
                    >
                      {Math.round(segment.topic_shift_score * 100)}% shift
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {segment.dominant_topics.slice(0, 5).map((topic, topicIndex) => (
                  <span
                    key={`${segment.segment_index}-${topicIndex}`}
                    className="text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded"
                  >
                    {topic.text} ({topic.value})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}