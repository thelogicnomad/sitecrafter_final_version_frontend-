/**
 * ProjectHistory Page - Shows user's saved projects
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import {
    ArrowLeft,
    FolderOpen,
    Clock,
    FileCode,
    Trash2,
    Loader2,
    Plus,
    Calendar
} from 'lucide-react';

interface ProjectSummary {
    _id: string;
    name: string;
    prompt: string;
    fileCount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export const ProjectHistory: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get or create session ID
    const getSessionId = () => {
        let sessionId = localStorage.getItem('sitecrafter_session_id');
        if (!sessionId) {
            sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            localStorage.setItem('sitecrafter_session_id', sessionId);
        }
        return sessionId;
    };

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

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const userId = getUserId();
            const sessionId = getSessionId();

            // If logged in, query by userId only; otherwise use sessionId for anonymous users
            const queryParams = userId
                ? `userId=${userId}`
                : `sessionId=${sessionId}`;

            const response = await axios.get(`${BACKEND_URL}/api/projects?${queryParams}`);
            setProjects(response.data.projects || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenProject = (projectId: string) => {
        navigate(`/agent?project=${projectId}`);
    };

    const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this project?')) return;

        try {
            await axios.delete(`${BACKEND_URL}/api/projects/${projectId}`);
            setProjects(prev => prev.filter(p => p._id !== projectId));
        } catch (err) {
            console.error('Failed to delete project:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <header className="h-14 border-b border-[#2e2e2e] flex items-center justify-between px-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <h1 className="text-lg font-semibold">My Projects</h1>
                <button
                    onClick={() => navigate('/agent')}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-sm font-medium text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/60 transition-all backdrop-blur-sm"
                >
                    <Plus size={16} />
                    New Project
                </button>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-400/70" />
                    </div>
                ) : error ? (
                    <div className="text-center py-16">
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={fetchProjects}
                            className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                        >
                            Retry
                        </button>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-16">
                        <FolderOpen className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-400 mb-2">No projects yet</h2>
                        <p className="text-gray-500 mb-6">Create your first project to see it here</p>
                        <button
                            onClick={() => navigate('/agent')}
                            className="px-6 py-3 bg-amber-500/20 border border-amber-500/40 rounded-lg font-medium text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/60 transition-all"
                        >
                            Create Project
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map(project => (
                            <div
                                key={project._id}
                                onClick={() => handleOpenProject(project._id)}
                                className="group bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-5 cursor-pointer hover:border-amber-500/30 hover:bg-[#1f1f1f] transition-all"
                            >
                                {/* Project Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate mt-1">
                                            {project.prompt.slice(0, 60)}...
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteProject(project._id, e)}
                                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Project Stats */}
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <FileCode size={14} />
                                        {project.fileCount} files
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {formatDate(project.createdAt)}
                                    </span>
                                </div>

                                {/* Status Badge */}
                                <div className="mt-3">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${project.status === 'complete'
                                        ? 'bg-amber-500/10 text-amber-300/80 border-amber-500/20'
                                        : project.status === 'generating'
                                            ? 'bg-yellow-500/10 text-yellow-300/80 border-yellow-500/20'
                                            : 'bg-red-500/10 text-red-300/80 border-red-500/20'
                                        }`}>
                                        <Clock size={12} />
                                        {project.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProjectHistory;


