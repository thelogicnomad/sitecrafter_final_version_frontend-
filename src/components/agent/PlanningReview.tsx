/**
 * PlanningReview Component - Shows architecture diagram for approval before code generation
 */

import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import WorkflowCanvas from '../planning/WorkflowCanvas';
import type { ProjectBlueprint } from '../../types/planning.types';

interface PlanningReviewProps {
    blueprint: ProjectBlueprint;
    onApprove: () => void;
    onReject: () => void;
}

export const PlanningReview: React.FC<PlanningReviewProps> = ({
    blueprint,
    onApprove,
    onReject
}) => {
    return (
        <div className="absolute inset-0 z-50 bg-[#0a0a0a]/98 backdrop-blur-sm overflow-auto">
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Blueprint Header */}
                    <div className="bg-[#1a1a1a] rounded-xl border border-[#2e2e2e] p-8">
                        <h2 className="text-2xl font-bold text-white mb-4">{blueprint.projectName}</h2>
                        <p className="text-gray-300 mb-6">{blueprint.description}</p>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <div className="text-3xl font-bold text-blue-400">
                                    {blueprint.workflow?.nodes?.length || 0}
                                </div>
                                <div className="text-blue-300 text-sm">Components</div>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                <div className="text-3xl font-bold text-green-400">
                                    {blueprint.workflow?.edges?.length || 0}
                                </div>
                                <div className="text-green-300 text-sm">Connections</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                <div className="text-3xl font-bold text-purple-400">
                                    {blueprint.features?.length || 0}
                                </div>
                                <div className="text-purple-300 text-sm">Features</div>
                            </div>
                        </div>

                        {/* Key Features */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-white mb-3">Key Features</h3>
                            <ul className="grid grid-cols-2 gap-2">
                                {(blueprint.features || []).slice(0, 8).map((feature: any, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                                        <Check className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                                        <span>{typeof feature === 'string' ? feature : feature.name || feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Tech Stack if available */}
                        {blueprint.techStack && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400">Frontend: </span>
                                    <span className="text-gray-200">{blueprint.techStack.frontend?.join(', ') || 'React'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Backend: </span>
                                    <span className="text-gray-200">{blueprint.techStack.backend?.join(', ') || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Workflow Canvas */}
                    {blueprint.workflow?.nodes && blueprint.workflow?.edges && (
                        <WorkflowCanvas
                            nodes={blueprint.workflow.nodes}
                            edges={blueprint.workflow.edges}
                        />
                    )}

                    {/* Approve/Reject */}
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Review Planning</h3>
                        <p className="text-gray-300 mb-6">
                            Does this architecture look good? Approve to start code generation.
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={onApprove}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={24} />
                                Approve & Start Coding
                                <ArrowRight size={20} />
                            </button>

                            <button
                                onClick={onReject}
                                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 rounded-lg font-bold hover:from-red-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={24} />
                                Start Over
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanningReview;
