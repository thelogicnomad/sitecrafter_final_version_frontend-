import React from 'react';
import { CheckCircle, Loader2, Circle, FileCode } from 'lucide-react';

export interface ProcessingPhase {
    id: string;
    name: string;
    status: 'pending' | 'in-progress' | 'complete' | 'error';
    filesCreated?: number;
}

interface ProcessingStepProps {
    phases: ProcessingPhase[];
    currentPhase?: string;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ phases, currentPhase }) => {
    const getIcon = (status: ProcessingPhase['status']) => {
        switch (status) {
            case 'complete':
                return <CheckCircle className="w-4 h-4 text-amber-400" />;
            case 'in-progress':
                return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
            case 'error':
                return <Circle className="w-4 h-4 text-red-400" />;
            default:
                return <Circle className="w-4 h-4 text-gray-600" />;
        }
    };

    const getLineColor = (status: ProcessingPhase['status']) => {
        switch (status) {
            case 'complete':
                return 'bg-amber-500';
            case 'in-progress':
                return 'bg-amber-500';
            default:
                return 'bg-gray-700';
        }
    };

    return (
        <div className="bg-[#141414] border border-[#2e2e2e] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-sm font-medium text-gray-200">Processing next step...</span>
            </div>

            <div className="space-y-1">
                {phases.map((phase, idx) => (
                    <div key={phase.id} className="flex items-start gap-3 relative">
                        {/* Vertical line */}
                        {idx < phases.length - 1 && (
                            <div className={`absolute left-[7px] top-5 w-0.5 h-6 ${getLineColor(phase.status)}`} />
                        )}

                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                            {getIcon(phase.status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${phase.status === 'complete' ? 'text-gray-400' :
                                        phase.status === 'in-progress' ? 'text-gray-200' :
                                            'text-gray-500'
                                    }`}>
                                    {phase.name}
                                </span>

                                {phase.filesCreated !== undefined && phase.filesCreated > 0 && (
                                    <span className="text-xs text-amber-400 flex items-center gap-1">
                                        <FileCode className="w-3 h-3" />
                                        {phase.filesCreated}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
