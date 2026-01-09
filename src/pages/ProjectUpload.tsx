/**
 * ProjectUpload Page - Upload zip files to import projects
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import {
    ArrowLeft,
    Upload,
    FileArchive,
    Loader2,
    CheckCircle,
    XCircle,
    FolderOpen
} from 'lucide-react';

interface UploadResult {
    success: boolean;
    projectId?: string;
    name?: string;
    description?: string;
    fileCount?: number;
    error?: string;
}

export const ProjectUpload: React.FC = () => {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<UploadResult[]>([]);
    const [dragActive, setDragActive] = useState(false);

    // Get user ID from localStorage (if logged in)
    const getUserId = () => {
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const parsed = JSON.parse(user);
                return parsed._id || parsed.id;
            }
        } catch { }
        return null;
    };

    const handleUpload = async (files: FileList) => {
        const userId = getUserId();

        for (const file of Array.from(files)) {
            if (!file.name.endsWith('.zip')) {
                setResults(prev => [...prev, {
                    success: false,
                    error: `${file.name}: Not a zip file`
                }]);
                continue;
            }

            setUploading(true);

            try {
                const formData = new FormData();
                formData.append('zipFile', file);
                if (userId) {
                    formData.append('userId', userId);
                }

                const response = await axios.post(
                    `${BACKEND_URL}/api/projects/upload`,
                    formData,
                    {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    }
                );

                setResults(prev => [...prev, {
                    success: true,
                    projectId: response.data.projectId,
                    name: response.data.name,
                    description: response.data.description,
                    fileCount: response.data.fileCount
                }]);

            } catch (err: any) {
                setResults(prev => [...prev, {
                    success: false,
                    error: `${file.name}: ${err.response?.data?.error || err.message}`
                }]);
            }

            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files) {
            handleUpload(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => {
        setDragActive(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleUpload(e.target.files);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <header className="h-14 border-b border-[#2e2e2e] flex items-center justify-between px-4">
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Projects</span>
                </button>
                <h1 className="text-lg font-semibold">Import Projects</h1>
                <div className="w-32" /> {/* Spacer */}
            </header>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-6 py-12">
                {/* Upload Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                        relative border-2 border-dashed rounded-2xl p-12 text-center transition-all
                        ${dragActive
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-[#3e3e3e] hover:border-emerald-500/50 hover:bg-white/5'
                        }
                    `}
                >
                    <input
                        type="file"
                        accept=".zip"
                        multiple
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <FileArchive className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-emerald-400' : 'text-gray-500'}`} />

                    <h2 className="text-xl font-semibold mb-2">
                        {dragActive ? 'Drop zip files here' : 'Upload Project Zip Files'}
                    </h2>
                    <p className="text-gray-400 mb-4">
                        Drag & drop your project zip files, or click to browse
                    </p>
                    <p className="text-xs text-gray-500">
                        Project name & description will be extracted from package.json
                    </p>

                    {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        </div>
                    )}
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <div className="mt-8 space-y-3">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">
                            Upload Results ({results.filter(r => r.success).length}/{results.length} successful)
                        </h3>

                        {results.map((result, i) => (
                            <div
                                key={i}
                                className={`p-4 rounded-lg border ${result.success
                                        ? 'border-emerald-500/30 bg-emerald-500/10'
                                        : 'border-red-500/30 bg-red-500/10'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {result.success ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        {result.success ? (
                                            <>
                                                <p className="font-medium text-emerald-400">{result.name}</p>
                                                <p className="text-sm text-gray-400 truncate">{result.description}</p>
                                                <p className="text-xs text-gray-500 mt-1">{result.fileCount} files imported</p>
                                            </>
                                        ) : (
                                            <p className="text-red-400">{result.error}</p>
                                        )}
                                    </div>

                                    {result.success && (
                                        <button
                                            onClick={() => navigate(`/agent?project=${result.projectId}`)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm transition-colors flex items-center gap-1"
                                        >
                                            <FolderOpen className="w-4 h-4" />
                                            Open
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => setResults([])}
                            className="w-full mt-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            Clear results
                        </button>
                    </div>
                )}

                {/* Info */}
                <div className="mt-12 p-4 bg-[#1a1a1a] rounded-lg border border-[#2e2e2e]">
                    <h4 className="font-medium mb-2">How it works:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Upload your project zip files</li>
                        <li>• Name & description extracted from package.json</li>
                        <li>• All source files (.tsx, .ts, .css, etc.) are imported</li>
                        <li>• Projects saved to your account in MongoDB</li>
                        <li>• Open any imported project to view & edit</li>
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default ProjectUpload;
