import React from 'react';
import { Bot, User, FileCode, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export type MessageType = 'thinking' | 'progress' | 'file' | 'success' | 'error' | 'user';

export interface AgentMessageData {
    id: string;
    type: MessageType;
    content: string;
    timestamp: Date;
    files?: string[];
    phase?: string;
}

interface AgentMessageProps {
    message: AgentMessageData;
}

export const AgentMessage: React.FC<AgentMessageProps> = ({ message }) => {
    const isUser = message.type === 'user';

    const getIcon = () => {
        switch (message.type) {
            case 'thinking':
                return <Loader2 className="w-4 h-4 animate-spin text-amber-400" />;
            case 'progress':
                return <Sparkles className="w-4 h-4 text-blue-400" />;
            case 'file':
                return <FileCode className="w-4 h-4 text-emerald-400" />;
            case 'success':
                return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'user':
                return <User className="w-4 h-4 text-gray-400" />;
            default:
                return <Bot className="w-4 h-4 text-emerald-400" />;
        }
    };

    const getMessageStyle = () => {
        switch (message.type) {
            case 'thinking':
                return 'border-l-amber-500/50 bg-amber-500/5';
            case 'progress':
                return 'border-l-blue-500/50 bg-blue-500/5';
            case 'file':
                return 'border-l-emerald-500/50 bg-emerald-500/5';
            case 'success':
                return 'border-l-emerald-500 bg-emerald-500/10';
            case 'error':
                return 'border-l-red-500 bg-red-500/10';
            case 'user':
                return 'border-l-gray-500/50 bg-gray-500/5';
            default:
                return 'border-l-[#2e2e2e] bg-[#141414]';
        }
    };

    return (
        <div className={`flex gap-3 p-4 border-l-2 ${getMessageStyle()} rounded-r-lg transition-all`}>
            <div className="flex-shrink-0 mt-0.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-gray-700' : 'bg-[#1f1f1f]'
                    }`}>
                    {isUser ? (
                        <User className="w-4 h-4 text-gray-300" />
                    ) : (
                        <Bot className="w-4 h-4 text-emerald-400" />
                    )}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-200">
                        {isUser ? 'You' : 'Agent'}
                    </span>
                    {message.phase && (
                        <span className="text-xs text-gray-500 bg-[#2e2e2e] px-2 py-0.5 rounded">
                            {message.phase}
                        </span>
                    )}
                    <span className="text-xs text-gray-600">
                        {message.timestamp.toLocaleTimeString()}
                    </span>
                </div>

                <div className="text-gray-300 text-sm leading-relaxed">
                    {message.content}
                </div>

                {message.files && message.files.length > 0 && (
                    <div className="mt-3 space-y-1">
                        {message.files.map((file, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded"
                            >
                                <FileCode className="w-3 h-3" />
                                <span className="font-mono">{file}</span>
                                <CheckCircle className="w-3 h-3 ml-auto" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
