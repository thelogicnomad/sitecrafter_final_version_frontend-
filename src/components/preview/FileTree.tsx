import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    FileCode,
    Folder,
    FolderOpen
} from 'lucide-react';

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: FileNode[];
    content?: string;
}

interface FileTreeProps {
    files: FileNode[];
    selectedFile?: string;
    onSelectFile: (file: FileNode) => void;
}

interface TreeNodeProps {
    node: FileNode;
    depth: number;
    selectedFile?: string;
    onSelectFile: (file: FileNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, selectedFile, onSelectFile }) => {
    const [isOpen, setIsOpen] = useState(depth < 2);
    const isFolder = node.type === 'folder';
    const isSelected = node.path === selectedFile;

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();

        const iconColors: Record<string, string> = {
            tsx: 'text-blue-400',
            ts: 'text-blue-300',
            jsx: 'text-yellow-400',
            js: 'text-yellow-300',
            css: 'text-pink-400',
            html: 'text-orange-400',
            json: 'text-green-400',
            md: 'text-gray-400',
        };

        return iconColors[ext || ''] || 'text-gray-400';
    };

    const handleClick = () => {
        if (isFolder) {
            setIsOpen(!isOpen);
        } else {
            onSelectFile(node);
        }
    };

    return (
        <div>
            <div
                onClick={handleClick}
                className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded transition-colors ${isSelected
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'hover:bg-[#2e2e2e] text-gray-300'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                {isFolder ? (
                    <>
                        {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        {isOpen ? (
                            <FolderOpen className="w-4 h-4 text-amber-400" />
                        ) : (
                            <Folder className="w-4 h-4 text-amber-400" />
                        )}
                    </>
                ) : (
                    <>
                        <span className="w-3.5" />
                        <FileCode className={`w-4 h-4 ${getFileIcon(node.name)}`} />
                    </>
                )}
                <span className="text-sm truncate">{node.name}</span>
            </div>

            {isFolder && isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            selectedFile={selectedFile}
                            onSelectFile={onSelectFile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC<FileTreeProps> = ({ files, selectedFile, onSelectFile }) => {
    if (files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Folder className="w-8 h-8 text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">No files yet</p>
                <p className="text-xs text-gray-600">Files will appear as they're created</p>
            </div>
        );
    }

    return (
        <div className="py-2">
            {files.map((file) => (
                <TreeNode
                    key={file.path}
                    node={file}
                    depth={0}
                    selectedFile={selectedFile}
                    onSelectFile={onSelectFile}
                />
            ))}
        </div>
    );
};
