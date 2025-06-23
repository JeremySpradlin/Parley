'use client';

import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-gray-100">
      <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/80 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <span className="text-sm text-gray-400 font-medium">Conversation Insights</span>
          </div>
          
          <Link
            href="/"
            className="bg-gray-600/60 hover:bg-gray-500/60 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm backdrop-blur-sm border border-gray-600/50 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Conversations
          </Link>
        </div>
      </header>
      
      <div className="p-6">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}