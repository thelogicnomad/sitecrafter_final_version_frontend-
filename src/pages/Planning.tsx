import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Loader2, Check, X, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import type { ProjectBlueprint } from '../types/planning.types';
import WorkflowCanvas from '../components/planning/WorkflowCanvas';

type PlanningState = 'input' | 'generating' | 'review';

export function Planning() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<PlanningState>('input');
  const [requirements, setRequirements] = useState('');
  const [projectType, setProjectType] = useState<'frontend' | 'backend' | 'fullstack'>('frontend');
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize from ProjectTypeSelection navigation and auto-generate
  useEffect(() => {
    const initializeAndGenerate = async () => {
      if (location.state?.prompt && location.state?.projectType) {
        const promptText = location.state.prompt;
        const typeFromSelection = location.state.projectType;
        
        setRequirements(promptText);
        setProjectType(typeFromSelection);
        
        // Auto-trigger generation
        console.log('[Planning] Auto-triggering generation from ProjectTypeSelection');
        console.log('[Planning] Project Type:', typeFromSelection);
        console.log('[Planning] Prompt:', promptText.substring(0, 100) + '...');
        
        setState('generating');
        setError(null);

        try {
          const response = await axios.post(`${BACKEND_URL}/planning`, {
            requirements: promptText.trim(),
            projectType: typeFromSelection
          });

          if (response.data.success && response.data.data?.blueprint) {
            setBlueprint(response.data.data.blueprint);
            setState('review');
          } else {
            setError(response.data.error || 'Failed to generate plan');
            setState('input');
          }
        } catch (err: any) {
          setError(err.response?.data?.error || err.message || 'Failed to generate plan');
          setState('input');
        }
      }
    };
    
    initializeAndGenerate();
  }, [location]);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirements.trim()) return;

    setState('generating');
    setError(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/planning`, {
        requirements: requirements.trim(),
        projectType: projectType
      });

      if (response.data.success && response.data.data?.blueprint) {
        setBlueprint(response.data.data.blueprint);
        setState('review');
      } else {
        setError(response.data.error || 'Failed to generate plan');
        setState('input');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate plan');
      setState('input');
    }
  };

  const handleApprove = () => {
    if (!blueprint) return;

    const detailedPrompt = createDetailedPrompt(blueprint);
    
    navigate('/builder', {
      state: {
        prompt: detailedPrompt,
        originalRequirements: requirements, // Pass original user input for template detection
        blueprint: blueprint
      }
    });
  };

  const handleReject = () => {
    setBlueprint(null);
    setState('input');
  };

  const createDetailedPrompt = (bp: ProjectBlueprint): string => {
    // Return detailedContext directly - it already contains everything
    return bp.detailedContext;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <header className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600/50 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
              Site Crafter - Planning Phase
            </h1>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {state === 'input' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Sparkles className="text-yellow-400" size={32} />
                Describe Your Project
              </h2>
              <p className="text-gray-400">Enter your requirements and we will generate a detailed plan</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleGeneratePlan} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Project Requirements
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g., Create a cake selling website with product catalog, shopping cart, checkout, and order management..."
                  className="w-full min-h-[200px] px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 focus:outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!requirements.trim()}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-6 py-4 rounded-lg font-bold hover:opacity-90 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                <Sparkles size={20} />
                Generate Planning
              </button>
            </form>
          </div>
        )}

        {state === 'generating' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-16 text-center">
            <Loader2 className="animate-spin mx-auto text-yellow-400 mb-6" size={64} />
            <h3 className="text-2xl font-bold text-white mb-2">Generating Workflow...</h3>
            <p className="text-gray-400">Analyzing architecture and creating detailed plan</p>
          </div>
        )}

        {state === 'review' && blueprint && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">{blueprint.projectName}</h2>
              <p className="text-gray-300 mb-6">{blueprint.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-400">{blueprint.workflow.nodes.length}</div>
                  <div className="text-blue-300 text-sm">Components</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-400">{blueprint.workflow.edges.length}</div>
                  <div className="text-green-300 text-sm">Connections</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-purple-400">{blueprint.features.length}</div>
                  <div className="text-purple-300 text-sm">Features</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Tech Stack</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Frontend</div>
                    <div className="text-gray-200">{blueprint.techStack.frontend.join(', ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Backend</div>
                    <div className="text-gray-200">{blueprint.techStack.backend.join(', ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Database</div>
                    <div className="text-gray-200">{blueprint.techStack.database.join(', ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">External</div>
                    <div className="text-gray-200">{blueprint.techStack.external.join(', ')}</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {blueprint.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                      <Check className="text-green-400 flex-shrink-0 mt-0.5" size={18} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Implementation Guide</h3>
                <p className="text-gray-300 text-sm">
                  Comprehensive {blueprint.detailedContext.length.toLocaleString()}-character implementation guide generated 
                  with detailed specifications for all components, APIs, styling, and architecture.
                </p>
              </div>
            </div>

            <WorkflowCanvas 
              nodes={blueprint.workflow.nodes} 
              edges={blueprint.workflow.edges} 
            />

            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Review Planning</h3>
              <p className="text-gray-300 mb-6">
                Does this architecture look good? Approve to start code generation.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleApprove}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={24} />
                  Approve & Start Coding
                  <ArrowRight size={20} />
                </button>

                <button
                  onClick={handleReject}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 rounded-lg font-bold hover:from-red-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
                >
                  <X size={24} />
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
