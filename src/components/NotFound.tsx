import React from 'react';

const NotFound: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center">
        <div className="text-9xl font-display font-bold text-cyber-600 mb-4 animate-pulse">
          404
        </div>
        <h1 className="text-4xl font-display font-bold text-cyber-400 mb-2">
          Page Not Found
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          The system is currently under maintenance
        </p>
        <div className="inline-block p-4 border border-cyber-600 rounded-lg bg-slate-900">
          <p className="text-cyber-300 font-mono text-sm">
            Please check back later
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
