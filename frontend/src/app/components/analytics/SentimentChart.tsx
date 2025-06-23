'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SentimentPoint {
  message_index: number;
  sentiment_polarity: number;
  sentiment_subjectivity: number;
  speaker: string;
}

interface SentimentChartProps {
  data: SentimentPoint[];
}

export function SentimentChart({ data }: SentimentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>No sentiment data available</p>
      </div>
    );
  }

  // Group data by speaker for separate lines
  const ai1Data = data.filter(point => point.speaker === 'ai1');
  const ai2Data = data.filter(point => point.speaker === 'ai2');

  // Combine data for chart
  const chartData = data.map((point, index) => ({
    messageIndex: point.message_index,
    [`${point.speaker}_polarity`]: point.sentiment_polarity,
    [`${point.speaker}_subjectivity`]: point.sentiment_subjectivity,
  }));

  // Merge all points by message index
  const mergedData: any[] = [];
  const maxIndex = Math.max(...data.map(p => p.message_index));
  
  for (let i = 0; i <= maxIndex; i++) {
    const entry: any = { messageIndex: i };
    
    const ai1Point = data.find(p => p.message_index === i && p.speaker === 'ai1');
    const ai2Point = data.find(p => p.message_index === i && p.speaker === 'ai2');
    
    if (ai1Point) {
      entry.ai1_polarity = ai1Point.sentiment_polarity;
      entry.ai1_subjectivity = ai1Point.sentiment_subjectivity;
    }
    
    if (ai2Point) {
      entry.ai2_polarity = ai2Point.sentiment_polarity;
      entry.ai2_subjectivity = ai2Point.sentiment_subjectivity;
    }
    
    mergedData.push(entry);
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-medium">{`Message ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value?.toFixed(3) || 'N/A'}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mergedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="messageIndex" 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <YAxis 
            domain={[-1, 1]}
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#9CA3AF' }} />
          
          {/* AI1 Sentiment Polarity */}
          <Line
            type="monotone"
            dataKey="ai1_polarity"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', stroke: '#1E40AF', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, fill: '#3B82F6', stroke: '#1E40AF', strokeWidth: 2 }}
            name="AI1 Sentiment"
            connectNulls={false}
          />
          
          {/* AI2 Sentiment Polarity */}
          <Line
            type="monotone"
            dataKey="ai2_polarity"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ fill: '#10B981', stroke: '#047857', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, fill: '#10B981', stroke: '#047857', strokeWidth: 2 }}
            name="AI2 Sentiment"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}