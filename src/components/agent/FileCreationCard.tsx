import React from 'react';
import { FileCode, CheckCircle } from 'lucide-react';

interface FileCreationCardProps {
    filePath: string;
    isNew?: boolean;
}

export const FileCreationCard: React.FC<FileCreationCardProps> = ({ filePath, isNew = true }) => {
    const fileName = filePath.split('/').pop() || filePath;
    const directory = filePath.split('/').slice(0, -1).join('/');

    return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${isNew
                ? 'bg-emerald-500/10 border-emerald-500/30 animate-pulse'
                : 'bg-[#1f1f1f] border-[#2e2e2e]'
            }`}>
            <FileCode className={`w-4 h-4 flex-shrink-0 ${isNew ? 'text-emerald-400' : 'text-gray-400'}`} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${isNew ? 'text-emerald-300' : 'text-gray-300'}`}>
                        {fileName}
                    </span>
                </div>
                {directory && (
                    <span className="text-xs text-gray-500 truncate block">
                        {directory}
                    </span>
                )}
            </div>

            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${isNew ? 'text-emerald-400' : 'text-gray-500'}`} />
        </div>
    );
};
