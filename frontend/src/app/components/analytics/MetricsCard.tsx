'use client';

interface MetricsCardProps {
  title: string;
  value: string;
  tooltip: string;
  icon: string;
}

export function MetricsCard({ title, value, tooltip, icon }: MetricsCardProps) {
  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/60 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-blue-600/20 rounded-lg flex items-center justify-center">
          <span className="text-xl">{icon}</span>
        </div>
        <div className="group relative">
          <svg 
            className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" 
              clipRule="evenodd" 
            />
          </svg>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
      </div>
    </div>
  );
}