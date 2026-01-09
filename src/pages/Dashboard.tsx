import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, LogOut, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  
    
    toast.success('Logged out successfully!', { autoClose: 2000 });
    
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/planning', { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <nav className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-2">
              <Laptop className="w-8 h-8 text-yellow-400" />
              <span className="text-xl font-bold text-white">SiteCrafter</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center space-y-6 mb-8">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-yellow-400 animate-pulse" />
              <div className="absolute -inset-1 bg-yellow-400/20 rounded-full blur-xl animate-blob" />
            </div>
            <h2 className="text-3xl font-bold text-white text-center">AI Website Generator</h2>
            <p className="text-gray-400 text-center max-w-xl">
              Transform your ideas into stunning websites with our AI-powered platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dream website in detail..."
              className="w-full h-40 px-4 py-3 text-gray-300 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 focus:outline-none resize-none transition-all duration-300 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className={`w-full ${
                prompt.trim() 
                  ? 'bg-yellow-400 hover:bg-yellow-300 transform hover:scale-[1.02]' 
                  : 'bg-yellow-400/50 cursor-not-allowed'
              } text-gray-900 py-4 px-6 rounded-xl font-semibold transition-all duration-300`}
            >
              Generate Website Plan
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;