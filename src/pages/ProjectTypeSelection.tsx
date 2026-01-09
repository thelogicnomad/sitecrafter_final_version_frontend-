import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Server, Layers, ArrowRight, Sparkles, Bot, Zap } from 'lucide-react';

type ProjectType = 'frontend' | 'backend' | 'fullstack';

export function ProjectTypeSelection() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [prompt, setPrompt] = useState('');

  const projectTypes = [
    {
      type: 'frontend' as ProjectType,
      icon: Code2,
      title: 'Frontend',
      description: 'Build beautiful, responsive web interfaces with React',
      color: 'from-blue-500 to-cyan-500',
      features: ['React 19 + TypeScript', 'Tailwind CSS', 'Framer Motion', 'Multi-page SPA']
    },
    {
      type: 'backend' as ProjectType,
      icon: Server,
      title: 'Backend',
      description: 'Create robust APIs and server-side applications',
      color: 'from-green-500 to-emerald-500',
      features: ['Node.js + Express', 'MongoDB', 'JWT Auth', 'RESTful APIs']
    },
    {
      type: 'fullstack' as ProjectType,
      icon: Layers,
      title: 'Fullstack',
      description: 'Complete end-to-end web applications',
      color: 'from-purple-500 to-pink-500',
      features: ['React Frontend', 'Node.js Backend', 'Full Integration', 'Production Ready']
    }
  ];

  const handleContinue = () => {
    if (!selectedType || !prompt.trim()) return;

    navigate('/planning', {
      state: {
        prompt: prompt.trim(),
        projectType: selectedType
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600/50 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
              Site Crafter
            </h1>
          </div>

          {/* Agent Builder Quick Access */}
          <button
            onClick={() => navigate('/agent')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Agent Builder</span>
            <Zap className="w-3 h-3" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Agent Mode Highlight Card */}
        <div
          onClick={() => navigate('/agent')}
          className="mb-8 p-6 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl cursor-pointer hover:border-emerald-400/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">Try Agent Mode</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-xs rounded-full font-medium">NEW</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Chat with an AI agent that builds your website step-by-step with real-time streaming
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            What would you like to build?
          </h2>
          <p className="text-xl text-gray-400">
            Choose your project type and let AI create production-ready code
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {projectTypes.map((pt) => {
            const Icon = pt.icon;
            const isSelected = selectedType === pt.type;

            return (
              <button
                key={pt.type}
                onClick={() => setSelectedType(pt.type)}
                className={`relative group p-6 rounded-xl transition-all duration-300 ${isSelected
                    ? 'bg-gradient-to-br ' + pt.color + ' scale-105 shadow-2xl'
                    : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600'
                  }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${isSelected ? 'bg-white/20' : 'bg-gray-700'
                    }`}>
                    <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-gray-300'
                      }`} />
                  </div>

                  <h3 className={`text-2xl font-bold mb-2 ${isSelected ? 'text-white' : 'text-gray-200'
                    }`}>
                    {pt.title}
                  </h3>

                  <p className={`mb-4 ${isSelected ? 'text-white/90' : 'text-gray-400'
                    }`}>
                    {pt.description}
                  </p>

                  <div className="space-y-2 w-full">
                    {pt.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className={`text-sm px-3 py-1 rounded-full ${isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-700/50 text-gray-300'
                          }`}
                      >
                        {feature}
                      </div>
                    ))}
                  </div>

                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedType && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-2xl font-bold text-white mb-4">
              Describe your {selectedType} project
            </h3>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectedType === 'frontend'
                  ? 'e.g., Create a portfolio website with dark mode, project gallery, and contact form'
                  : selectedType === 'backend'
                    ? 'e.g., Create a REST API for an e-commerce store with products, orders, and authentication'
                    : 'e.g., Create a task management app with user authentication, real-time updates, and team collaboration'
              }
              className="w-full min-h-[150px] px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 focus:outline-none resize-none"
              autoFocus
            />

            <button
              onClick={handleContinue}
              disabled={!prompt.trim()}
              className="mt-6 w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-6 py-4 rounded-lg font-bold hover:opacity-90 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              Generate Planning
              <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
