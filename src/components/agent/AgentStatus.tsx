import React from 'react';
import { PulsingDot } from '../ui/Spinner';

export type AgentStatusType = 'idle' | 'running' | 'complete' | 'error';

interface AgentStatusProps {
    status: AgentStatusType;
    message?: string;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ status, message }) => {
    const statusConfig = {
        idle: {
            color: 'bg-gray-500',
            text: 'Ready to build',
            textColor: 'text-gray-400'
        },
        running: {
            color: 'bg-amber-500',
            text: message || 'Agent is running...',
            textColor: 'text-amber-400'
        },
        complete: {
            color: 'bg-blue-500',
            text: 'Build complete',
            textColor: 'text-blue-400'
        },
        error: {
            color: 'bg-red-500',
            text: message || 'Something went wrong',
            textColor: 'text-red-400'
        }
    };

    const config = statusConfig[status];

    return (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#141414] border-b border-[#2e2e2e]">
            <PulsingDot color={config.color} />
            <span className={`text-sm font-medium ${config.textColor}`}>
                {config.text}
            </span>
        </div>
    );
};
