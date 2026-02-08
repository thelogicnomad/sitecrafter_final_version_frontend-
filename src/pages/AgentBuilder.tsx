import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { ChatPanel } from '../components/agent/ChatPanel';
import { PreviewPanel } from '../components/preview/PreviewPanel';
import { PlanningReview } from '../components/agent/PlanningReview';
import { AgentMessageData, MessageType } from '../components/agent/AgentMessage';
import { ProcessingPhase } from '../components/agent/ProcessingStep';
import { AgentStatusType } from '../components/agent/AgentStatus';
import { FileNode } from '../components/preview/FileTree';
import { BACKEND_URL } from '../config';
import { useWebContainer } from '../hooks/useWebContainer.tsx';
import { parseStackTrace } from '../utils/errorReporter';
import type { ProjectBlueprint } from '../types/planning.types';
import { ArrowLeft, Sparkles, Loader2, Zap, FolderOpen } from 'lucide-react';
import type { FileSystemTree } from '@webcontainer/api';
// import { WebContainerTerminal } from '../components/terminal/WebContainerTerminal';

const MAX_FIX_ATTEMPTS = 50; // Allow many fix attempts for continuous error resolution

// Helper to convert flat file list to tree structure
const buildFileTree = (files: { path: string; content: string }[]): FileNode[] => {
    const root: FileNode[] = [];

    files.forEach(file => {
        const parts = file.path.replace(/^\//, '').split('/');
        let current = root;
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath += '/' + part;
            const isFile = index === parts.length - 1;

            let existing = current.find(n => n.name === part);

            if (!existing) {
                existing = {
                    name: part,
                    path: currentPath,
                    type: isFile ? 'file' : 'folder',
                    children: isFile ? undefined : [],
                    content: isFile ? file.content : undefined
                };
                current.push(existing);
            }

            if (!isFile && existing.children) {
                current = existing.children;
            }
        });
    });

    // Sort: folders first, then files alphabetically
    const sortNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        }).map(node => ({
            ...node,
            children: node.children ? sortNodes(node.children) : undefined
        }));
    };

    return sortNodes(root);
};

// Convert flat files to WebContainer FileSystemTree format
const toWebContainerFS = (files: { path: string; content: string }[]): FileSystemTree => {
    const tree: FileSystemTree = {};

    for (const file of files) {
        const pathParts = file.path.replace(/^\//, '').split('/');
        let current: any = tree;

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const isLast = i === pathParts.length - 1;

            if (isLast) {
                current[part] = { file: { contents: file.content } };
            } else {
                if (!current[part]) {
                    current[part] = { directory: {} };
                }
                current = current[part].directory;
            }
        }
    }

    return tree;
};

export const AgentBuilder: React.FC = () => {
    const navigate = useNavigate();

    // Use the enhanced WebContainer hook with all features
    const {
        isBooting,
        isInstalling,
        isRunning,
        previewUrl: wcPreviewUrl,
        error: wcError,
        terminalOutput,
        isPreWarmed,
        isPreWarming,
        mountFiles,
        startDevServer,
        updateFile,
        reset: resetWebContainer,
        runCommand,
        killProcess,
    } = useWebContainer();

    // State
    const [messages, setMessages] = useState<AgentMessageData[]>([]);
    const [phases, setPhases] = useState<ProcessingPhase[]>([
        { id: 'blueprint', name: 'Generating blueprint', status: 'pending' },
        { id: 'core', name: 'Creating core files', status: 'pending' },
        { id: 'components', name: 'Building components', status: 'pending', filesCreated: 0 },
        { id: 'pages', name: 'Creating pages', status: 'pending', filesCreated: 0 },
        { id: 'repair', name: 'Validation & repair', status: 'pending' }
    ]);
    const [status, setStatus] = useState<AgentStatusType>('idle');
    const [statusMessage, setStatusMessage] = useState<string>();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCreating, setIsCreating] = useState(false); // NEW: Track if we're creating a new project

    const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

    // Auto-fix state
    const [isFixing, setIsFixing] = useState(false);
    const [fixCount, setFixCount] = useState(0);
    const fixingRef = useRef(false);
    const fixAttempts = useRef(0);
    const filesRef = useRef<{ path: string; content: string }[]>([]);
    const fixedFilesRef = useRef<Set<string>>(new Set());

    // Planning review state
    const [showPlanningReview, setShowPlanningReview] = useState(false);
    const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
    const [pendingPrompt, setPendingPrompt] = useState<string>('');
    const [projectId, setProjectId] = useState<string | null>(null);

    // Refs to track current values for callbacks (avoid stale closures)
    const projectIdRef = useRef<string | null>(null);
    const filesCountRef = useRef<number>(0);

    const abortControllerRef = useRef<AbortController | null>(null);
    const [searchParams] = useSearchParams();
    const [isLoadingProject, setIsLoadingProject] = useState(false);

    // Load project from URL parameter on mount
    useEffect(() => {
        const projectIdFromUrl = searchParams.get('project');
        if (projectIdFromUrl && !projectId && files.length === 0 && !isLoadingProject) {
            loadProject(projectIdFromUrl);
        }
    }, [searchParams]);

    // Save projectId to localStorage for WebContainer new tab redirect support
    useEffect(() => {
        if (projectId) {
            localStorage.setItem('lastProjectId', projectId);
        }
        // Keep ref in sync with state
        projectIdRef.current = projectId;
    }, [projectId]);

    // Keep files count ref in sync
    useEffect(() => {
        filesCountRef.current = files.length;
    }, [files.length]);

    // Keep filesRef in sync with files state for error fixing
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    // Function to load a project from the API
    const loadProject = async (id: string) => {
        setIsLoadingProject(true);
        setStatusMessage('Loading project...');

        try {
            const response = await axios.get(`${BACKEND_URL}/api/projects/${id}`);
            const project = response.data.project;

            if (project && project.files) {
                // Set project ID
                setProjectId(id);

                // Set files
                const projectFiles = project.files.map((f: any) => ({
                    path: f.path.startsWith('/') ? f.path : '/' + f.path,
                    content: f.content,
                }));
                setFiles(projectFiles);

                // Build file tree
                const tree = buildFileTree(projectFiles);
                setFileTree(tree);

                // Set blueprint if available
                if (project.blueprint) {
                    setBlueprint(project.blueprint);
                }

                // Set prompt
                if (project.prompt) {
                    setPendingPrompt(project.prompt);
                }

                // Add success message (inline since addMessage not defined yet)
                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
                    type: 'success' as MessageType,
                    content: `📂 Loaded project: ${project.name} (${projectFiles.length} files)`,
                    timestamp: new Date(),
                }]);
                setStatus('complete');

                // Mount files to WebContainer and start dev server
                const fsTree = toWebContainerFS(projectFiles);
                await mountFiles(fsTree);
                await startDevServer();
            }
        } catch (err: any) {
            console.error('Failed to load project:', err);
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
                type: 'error' as MessageType,
                content: `Failed to load project: ${err.message}`,
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoadingProject(false);
            setStatusMessage(undefined);
        }
    };

    // Keep filesRef in sync
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    // Update file tree when files change
    useEffect(() => {
        if (files.length > 0) {
            const tree = buildFileTree(files);
            setFileTree(tree);
        }
    }, [files]);

    // Helper to add a message - uses crypto.randomUUID for unique keys
    const addMessage = useCallback((type: MessageType, content: string, phase?: string, filesArr?: string[]) => {
        const message: AgentMessageData = {
            id: `msg-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            type,
            content,
            timestamp: new Date(),
            phase,
            files: filesArr
        };
        setMessages(prev => [...prev, message]);
    }, []);

    // Update phase status
    const updatePhase = useCallback((id: string, status: ProcessingPhase['status'], filesCreated?: number) => {
        setPhases(prev => prev.map(p =>
            p.id === id ? { ...p, status, filesCreated: filesCreated ?? p.filesCreated } : p
        ));
    }, []);

    // Get or create session ID
    const getSessionId = () => {
        let sessionId = localStorage.getItem('sitecrafter_session_id');
        if (!sessionId) {
            sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            localStorage.setItem('sitecrafter_session_id', sessionId);
        }
        return sessionId;
    };

    // Save project to MongoDB
    const saveProject = useCallback(async (collectedFiles: { path: string; content: string }[]) => {
        try {
            const response = await axios.post(`${BACKEND_URL}/api/projects`, {
                sessionId: getSessionId(),
                prompt: pendingPrompt,
                files: collectedFiles,
                blueprint: blueprint,
            });

            if (response.data.success) {
                setProjectId(response.data.projectId);
                addMessage('success', `💾 Project saved: ${response.data.name}`);
                console.log('Project saved with ID:', response.data.projectId);
            }
        } catch (err) {
            console.error('Failed to save project:', err);
        }
    }, [pendingPrompt, blueprint, addMessage]);

    // Handle file content changes from Monaco Editor
    const handleFileChange = useCallback(async (path: string, content: string) => {
        setFiles(prev => prev.map(f =>
            f.path === path ? { ...f, content } : f
        ));

        // Also update selectedFile if it's the currently selected one
        if (selectedFile?.path === path) {
            setSelectedFile(prev => prev ? { ...prev, content } : prev);
        }

        // Update the file in WebContainer (hot reload)
        if (isRunning) {
            await updateFile(path.replace(/^\//, ''), content);
        }

        // Auto-save to MongoDB (debounced)
        if (projectId) {
            // Clear any pending save
            if ((window as any).__saveTimeout) {
                clearTimeout((window as any).__saveTimeout);
            }
            // Debounce save - wait 2 seconds after last change
            (window as any).__saveTimeout = setTimeout(async () => {
                try {
                    await axios.patch(`${BACKEND_URL}/api/projects/${projectId}/files`, {
                        files: [{ path, content }]
                    });
                    console.log('✅ Auto-saved to MongoDB:', path);
                } catch (err) {
                    console.error('❌ Auto-save failed:', err);
                }
            }, 2000);
        }
    }, [selectedFile?.path, updateFile, isRunning, projectId]);

    // Parse error from terminal output - STRICT error detection
    const parseError = useCallback((output: string[]): { file: string; error: string } | null => {
        // Strip ANSI escape codes for better pattern matching
        const rawText = output.slice(-80).join('\n');
        const text = rawText.replace(/\x1B\[[0-9;]*[mGKHF]/g, '').replace(/\[\d+m/g, '');

        // Skip if this looks like a successful update message, not an error
        if (text.includes('hmr update') && !text.includes('[plugin:vite')) {
            return null;
        }
        if (text.includes('✅') && !text.includes('[plugin:vite')) {
            return null;
        }

        // 1. Vite plugin errors (most common)
        // Pattern: [plugin:vite:react-babel] or [plugin:vite:import-analysis] etc.
        if (text.includes('[plugin:vite:')) {
            // Extract file from "File:" line
            const fileLineMatch = text.match(/File:\s*(?:\/home\/[^\/]+\/)?(src\/[^\s:]+\.tsx?)(?::(\d+))?/);
            if (fileLineMatch) {
                const filePath = fileLineMatch[1];
                console.log('🎯 Vite plugin error, file:', filePath);
                return {
                    file: filePath,
                    error: `Vite Error in ${filePath}\n\nFull error:\n${text.slice(-1000)}`,
                };
            }

            // Try to extract from error message itself
            const inlineFileMatch = text.match(/(?:\/home\/[^\/]+\/)?(src\/[^\s:)]+\.tsx?)/);
            if (inlineFileMatch) {
                console.log('🎯 Vite plugin error (inline), file:', inlineFileMatch[1]);
                return {
                    file: inlineFileMatch[1],
                    error: `Vite Error in ${inlineFileMatch[1]}\n\nFull error:\n${text.slice(-1000)}`,
                };
            }
        }

        // 2. Import resolution errors
        const importMatch = text.match(/Failed to resolve import\s*["']([^"']+)["']\s*from\s*["']([^"']+)["']/);
        if (importMatch) {
            const sourceFile = importMatch[2].replace(/^\//, '');
            const filePath = sourceFile.startsWith('src/') ? sourceFile : 'src/' + sourceFile.split('src/').pop();
            console.log('🎯 Import error, file:', filePath);
            return {
                file: filePath,
                error: `Import Error: Cannot find "${importMatch[1]}" in ${filePath}\n\nFull error:\n${text.slice(-800)}`,
            };
        }

        // 3. TypeScript errors (with line numbers)
        const tsMatch = text.match(/(src\/[\w\-\/]+\.tsx?)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.+)/);
        if (tsMatch) {
            console.log('🎯 TypeScript error, file:', tsMatch[1]);
            return {
                file: tsMatch[1],
                error: `TypeScript ${tsMatch[4]} at line ${tsMatch[2]}: ${tsMatch[5]}\n\nFull error:\n${text.slice(-600)}`,
            };
        }

        // 4. Syntax errors with specific patterns
        if (text.includes('SyntaxError') || text.includes('Unexpected token')) {
            const fileMatch = text.match(/(?:\/home\/[^\/]+\/)?(src\/[\w\-\/]+\.tsx?)/);
            if (fileMatch) {
                console.log('🎯 Syntax error, file:', fileMatch[1]);
                return {
                    file: fileMatch[1],
                    error: `Syntax Error in ${fileMatch[1]}\n\n${text.slice(-600)}`
                };
            }
        }

        // 5. Module not found (strict pattern)
        const moduleMatch = text.match(/Cannot find module\s*["']([^"']+)["']/);
        if (moduleMatch) {
            const fileMatch = text.match(/(?:\/home\/[^\/]+\/)?(src\/[\w\-\/]+\.tsx?)/);
            if (fileMatch) {
                console.log('🎯 Module not found, file:', fileMatch[1]);
                return {
                    file: fileMatch[1],
                    error: `Module not found: ${moduleMatch[1]}\n\n${text.slice(-500)}`
                };
            }
        }

        return null;
    }, []);

    // Fix code error using LLM
    const fixCodeError = useCallback(async (errorFile: string, errorText: string) => {
        if (fixingRef.current) return false;

        const errorKey = `${errorFile}:${errorText.slice(0, 100)}`;
        if (fixedFilesRef.current.has(errorKey)) {
            console.log(`Already fixed: ${errorFile}, skipping`);
            return false;
        }

        fixingRef.current = true;
        setIsFixing(true);
        fixAttempts.current++;

        let fixSuccess = false;

        try {
            // Check if this is a "missing component" error
            const missingImportMatch = errorText.match(/Cannot find module ["']([^"']+)["']|Failed to resolve import ["']([^"']+)["']/i);

            if (missingImportMatch) {
                const missingPath = missingImportMatch[1] || missingImportMatch[2];
                console.log('🆕 Missing component detected:', missingPath);

                // Extract component name and path
                const componentName = missingPath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'Component';
                let filePath = missingPath;

                // Handle @/ alias
                if (filePath.startsWith('@/')) {
                    filePath = filePath.replace('@/', 'src/');
                }
                if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
                    filePath += '.tsx';
                }
                if (!filePath.startsWith('src/')) {
                    filePath = 'src/' + filePath;
                }

                addMessage('thinking', `🆕 Creating missing component: ${componentName}...`);

                // Generate a simple component using LLM
                const response = await fetch(`${BACKEND_URL}/api/fix-error`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: `Create a new React component for: ${componentName}. The file path is ${filePath}. Make it a functional TypeScript component with proper props interface and modern styling using Tailwind CSS.`,
                        filePath: filePath,
                        fileContent: '// NEW FILE - GENERATE COMPONENT',
                    }),
                });

                if (response.ok) {
                    const { fixedCode } = await response.json();
                    if (fixedCode) {
                        // Add to files state
                        setFiles(prev => [...prev, { path: '/' + filePath, content: fixedCode }]);

                        // Write to WebContainer
                        await updateFile(filePath, fixedCode);

                        // Auto-save to MongoDB
                        if (projectId) {
                            try {
                                await axios.patch(`${BACKEND_URL}/api/projects/${projectId}/files`, {
                                    files: [{ path: '/' + filePath, content: fixedCode }]
                                });
                                console.log('✅ Auto-saved fix to MongoDB:', filePath);
                            } catch (err) {
                                console.error('❌ Failed to auto-save fix:', err);
                            }
                        }

                        setFixCount(prev => prev + 1);
                        fixedFilesRef.current.add(errorKey);
                        addMessage('success', `✅ Created missing component: ${componentName}`);
                        fixSuccess = true;
                    }
                }
            } else {
                // Standard fix for existing files
                let targetFile = filesRef.current.find(f =>
                    f.path === errorFile ||
                    f.path.endsWith(errorFile) ||
                    f.path.includes(errorFile.replace('src/', ''))
                );

                if (!targetFile?.content) {
                    const fileName = errorFile.split('/').pop();
                    if (fileName) {
                        targetFile = filesRef.current.find(f => f.path.endsWith(fileName));
                    }
                }

                if (!targetFile?.content) {
                    console.warn(`File not found: ${errorFile}`);
                    fixingRef.current = false;
                    setIsFixing(false);
                    return false;
                }

                console.log(`🔧 Fixing code in: ${targetFile.path}`);
                addMessage('thinking', `🔧 Auto-fixing error in ${targetFile.path}...`);

                const response = await fetch(`${BACKEND_URL}/api/fix-error`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: errorText,
                        filePath: targetFile.path,
                        fileContent: targetFile.content,
                    }),
                });

                if (!response.ok) throw new Error('Backend failed');

                const { fixedCode } = await response.json();

                if (fixedCode && fixedCode !== targetFile.content) {
                    // Update file in state
                    setFiles(prev => prev.map(f =>
                        f.path === targetFile!.path ? { ...f, content: fixedCode } : f
                    ));

                    // Update file in WebContainer
                    await updateFile(targetFile.path.replace(/^\//, ''), fixedCode);

                    // Auto-save to MongoDB
                    if (projectId) {
                        try {
                            await axios.patch(`${BACKEND_URL}/api/projects/${projectId}/files`, {
                                files: [{ path: targetFile.path, content: fixedCode }]
                            });
                            console.log('✅ Auto-saved fix to MongoDB:', targetFile.path);
                        } catch (err) {
                            console.error('❌ Failed to auto-save fix:', err);
                        }
                    }

                    setFixCount(prev => prev + 1);
                    // Add to fixed set but remove after a delay to allow re-checking for NEW errors
                    fixedFilesRef.current.add(errorKey);
                    setTimeout(() => {
                        fixedFilesRef.current.delete(errorKey);
                    }, 15000); // Allow re-attempting after 15 seconds for new errors

                    addMessage('success', `✅ Fixed error in ${targetFile.path}`);
                    fixSuccess = true;
                }
            }
        } catch (err) {
            console.error('Fix failed:', err);
            addMessage('error', `❌ Auto-fix failed: ${err}`);
        } finally {
            fixingRef.current = false;
            setIsFixing(false);
        }

        // After successful fix, schedule a re-check for more errors
        // Check for any errors (same or different file) but with a longer delay for same file
        if (fixSuccess) {
            // First check after 3 seconds for errors in OTHER files
            setTimeout(() => {
                const newErrorInfo = parseError(terminalOutput);
                if (newErrorInfo && newErrorInfo.file && newErrorInfo.file !== errorFile) {
                    console.log('🔄 More errors detected in different file:', newErrorInfo.file);
                    fixCodeError(newErrorInfo.file, newErrorInfo.error);
                }
            }, 3000);

            // Second check after 8 seconds for potentially NEW errors in same file
            setTimeout(() => {
                const newErrorInfo = parseError(terminalOutput);
                if (newErrorInfo && newErrorInfo.file) {
                    const newErrorKey = `${newErrorInfo.file}:${newErrorInfo.error.slice(0, 100)}`;
                    // Only fix if it's a NEW error (different error key)
                    if (!fixedFilesRef.current.has(newErrorKey)) {
                        console.log('🔄 New error detected, attempting fix:', newErrorInfo.file);
                        fixCodeError(newErrorInfo.file, newErrorInfo.error);
                    } else {
                        console.log('✅ No new errors to fix');
                    }
                } else {
                    console.log('✅ No more errors detected in terminal output');
                }
            }, 8000); // Wait longer before re-checking same file
        }

        return fixSuccess;
    }, [addMessage, updateFile, parseError, terminalOutput]);

    // Watch terminal output for errors and auto-fix
    // Track last fix time per file to prevent repeated fixes
    const lastFixTimeRef = useRef<Map<string, number>>(new Map());
    const FIX_COOLDOWN_MS = 10000; // 10 seconds cooldown per file

    useEffect(() => {
        if (!isRunning || fixingRef.current || isFixing) return;
        if (fixAttempts.current >= MAX_FIX_ATTEMPTS) return;

        const errorInfo = parseError(terminalOutput);
        if (!errorInfo?.file) return;

        // Check cooldown for this file
        const now = Date.now();
        const lastFixTime = lastFixTimeRef.current.get(errorInfo.file) || 0;
        if (now - lastFixTime < FIX_COOLDOWN_MS) {
            // Still in cooldown, skip
            return;
        }

        // Check if already fixed (using the ref)
        const errorKey = `${errorInfo.file}:${errorInfo.error.slice(0, 100)}`;
        if (fixedFilesRef.current.has(errorKey)) {
            return;
        }

        console.log('🔧 Auto-fix triggered for:', errorInfo.file);
        lastFixTimeRef.current.set(errorInfo.file, now);

        const timeoutId = setTimeout(() => {
            fixCodeError(errorInfo.file, errorInfo.error);
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [terminalOutput, isRunning, isFixing, parseError, fixCodeError]);

    // Listen for runtime errors from preview iframe
    useEffect(() => {
        const handleRuntimeError = (event: MessageEvent) => {
            if (event.data?.type !== 'RUNTIME_ERROR') return;
            if (!isRunning) return;
            if (fixAttempts.current >= MAX_FIX_ATTEMPTS) return;

            const { message, stack, errorType } = event.data;
            console.log('Runtime error received:', { message, stack, errorType });

            // Pass both stack and message to parseStackTrace for better file detection
            const { filePath } = parseStackTrace(stack || '', message || '');

            if (filePath) {
                const errorContext = `Runtime Error (${errorType})\n${message}\n\nStack trace:\n${stack}`;
                const errorKey = `${filePath}:${errorContext.slice(0, 100)}`;

                // Check if already fixed (but allow new errors on same file)
                if (fixedFilesRef.current.has(errorKey)) {
                    console.log('Skipping already-fixed error:', filePath);
                    return;
                }

                // If currently fixing, queue this error for later instead of dropping
                if (fixingRef.current || isFixing) {
                    console.log('Currently fixing, queuing error for later:', filePath);
                    setTimeout(() => {
                        // Re-check if still needs fixing after delay
                        if (!fixedFilesRef.current.has(errorKey)) {
                            fixCodeError(filePath, errorContext);
                        }
                    }, 3000);
                    return;
                }

                // Immediate fix
                setTimeout(() => {
                    fixCodeError(filePath, errorContext);
                }, 1500);
            } else {
                console.warn('Could not extract file path from runtime error:', message);
            }
        };

        window.addEventListener('message', handleRuntimeError);
        return () => window.removeEventListener('message', handleRuntimeError);
    }, [isRunning, isFixing, fixCodeError]);

    // Handle send message - Using SSE for real-time streaming
    const handleSendMessage = useCallback(async (userMessage: string) => {
        // Add user message
        addMessage('user', userMessage);

        // Use refs to get the CURRENT values (avoid stale closures)
        const currentProjectId = projectIdRef.current;
        const currentFilesCount = filesCountRef.current;

        console.log('📨 handleSendMessage check:', {
            projectId: currentProjectId,
            filesCount: currentFilesCount,
            isFollowUp: !!(currentProjectId && currentFilesCount > 0)
        });

        // Check if this is a follow-up (project already exists)
        if (currentProjectId && currentFilesCount > 0) {
            setIsProcessing(true);
            setStatusMessage('Understanding your request...');
            addMessage('thinking', '🧠 Analyzing your message...');

            try {
                // Use the new intelligent chat endpoint
                const response = await axios.post(`${BACKEND_URL}/api/projects/${currentProjectId}/chat`, {
                    message: userMessage,
                });

                const { intent, response: chatResponse, modifiedFiles } = response.data;

                // Handle based on detected intent
                if (intent === 'question' || intent === 'explain') {
                    // Just show the answer - no file modifications
                    addMessage('success', `💬 ${chatResponse}`);
                } else if (intent === 'modify') {
                    // Show modification results
                    if (modifiedFiles && modifiedFiles.length > 0) {
                        // Update files in state
                        for (const modified of modifiedFiles) {
                            const path = modified.path.startsWith('/') ? modified.path : '/' + modified.path;

                            setFiles(prev => {
                                const existing = prev.find(f => f.path === path);
                                if (existing) {
                                    return prev.map(f => f.path === path ? { ...f, content: modified.content } : f);
                                } else {
                                    return [...prev, { path, content: modified.content }];
                                }
                            });

                            // Update in WebContainer
                            await updateFile(modified.path.replace(/^\//, ''), modified.content);
                        }

                        addMessage('success', `✅ ${chatResponse}`);
                    } else {
                        addMessage('progress', chatResponse || 'No modifications were needed.');
                    }
                }

            } catch (err: any) {
                addMessage('error', `Request failed: ${err.message}`);
            } finally {
                setIsProcessing(false);
                setStatusMessage(undefined);
            }
            return;
        }

        // New project - Reset state
        setPhases(prev => prev.map(p => ({ ...p, status: 'pending', filesCreated: 0 })));
        setFiles([]);
        setFileTree([]);
        setSelectedFile(null);
        setFixCount(0);
        fixAttempts.current = 0;
        fixedFilesRef.current.clear();
        setProjectId(null);

        // Set processing state - this is NEW PROJECT CREATION
        setIsProcessing(true);
        setIsCreating(true); // NEW: Mark as creating to show phases UI
        setStatus('running');
        setStatusMessage('Generating architecture plan...');

        // Add thinking message
        addMessage('thinking', "I'm analyzing your requirements and planning the website structure...");

        try {
            updatePhase('blueprint', 'in-progress');

            // Call /planning endpoint to get blueprint for review
            const response = await axios.post(`${BACKEND_URL}/planning`, {
                requirements: userMessage.trim(),
                projectType: 'frontend'
            });

            if (response.data.success && response.data.data?.blueprint) {
                setBlueprint(response.data.data.blueprint);
                setPendingPrompt(userMessage);
                setShowPlanningReview(true);
                updatePhase('blueprint', 'complete');
                setIsProcessing(false);
                addMessage('success', `📋 Planning complete! Review the architecture.`);
                setStatusMessage('Review the plan and approve to start coding');
                return; // Exit here - handleApproveAndContinue takes over after user approval
            }
        } catch (error: any) {
            console.error('Planning error:', error);
            addMessage('error', `Planning failed: ${error.message || 'Unknown error'}`);
            setStatus('error');
            setStatusMessage(error.message);
        } finally {
            setIsProcessing(false);
        }
    }, [addMessage, updatePhase, updateFile]);

    // Handle stop
    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    // Handle approve planning and start code generation
    const handleApproveAndContinue = useCallback(async () => {
        if (!blueprint) return;
        setShowPlanningReview(false);
        setIsProcessing(true);
        setStatus('running');
        addMessage('thinking', 'Starting code generation from approved plan...');

        // Trigger the existing SSE generation with the detailedContext
        const prompt = blueprint.detailedContext || pendingPrompt;

        try {
            abortControllerRef.current = new AbortController();
            updatePhase('core', 'in-progress');
            setStatusMessage('Generating code...');

            const response = await fetch(`${BACKEND_URL}/chat/langgraph-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, projectType: 'frontend' }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let componentCount = 0, pageCount = 0, totalFiles = 0;
            const collected: { path: string; content: string }[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'file') {
                                totalFiles++;
                                const path = data.path.startsWith('/') ? data.path : '/' + data.path;
                                collected.push({ path, content: data.content });
                                setFiles(prev => [...prev, { path, content: data.content }]);
                                if (data.phase === 'components') componentCount++;
                                else if (data.phase === 'page') pageCount++;
                            } else if (data.type === 'phase') {
                                setStatusMessage(data.message);
                            } else if (data.type === 'complete') {
                                setStatus('complete');
                                addMessage('success', `✅ Generated ${totalFiles} files!`);
                                if (collected.length > 0) {
                                    const fsTree = toWebContainerFS(collected);
                                    await mountFiles(fsTree);
                                    await startDevServer();
                                    // Save project to MongoDB
                                    await saveProject(collected);
                                }
                            }
                        } catch { }
                    }
                }
            }
        } catch (e: any) {
            addMessage('error', e.message);
            setStatus('error');
        } finally {
            setIsProcessing(false);
            setIsCreating(false); // Reset creation mode when done
        }
    }, [blueprint, pendingPrompt, addMessage, updatePhase, mountFiles, startDevServer, saveProject]);

    // Handle reject planning
    const handleRejectPlan = useCallback(() => {
        setShowPlanningReview(false);
        setBlueprint(null);
        setPendingPrompt('');
        setStatus('idle');
        addMessage('progress', 'Plan rejected. Try a different prompt.');
    }, [addMessage]);

    // Handle file select
    const handleSelectFile = useCallback((file: FileNode) => {
        if (file.type === 'file') {
            const fullFile = files.find(f => f.path === file.path);
            setSelectedFile({
                ...file,
                content: fullFile?.content || file.content
            });
        }
    }, [files]);

    // Handle download
    const handleDownload = useCallback(async () => {
        if (files.length === 0) return;

        const zip = new JSZip();

        files.forEach(file => {
            const path = file.path.replace(/^\//, '');
            zip.file(path, file.content);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'sitecrafter-project.zip');

        addMessage('success', 'Project downloaded successfully!');
    }, [files, addMessage]);

    return (
        <div className="flex flex-col h-screen bg-[#0a0a0a] text-white relative">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e] bg-[#141414]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-[#2e2e2e] rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-teal-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-gray-100">SiteCrafter Agent</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* WebContainer Status */}
                    <div className="flex items-center gap-2 text-xs">
                        {isPreWarmed && !isPreWarming && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-full text-amber-500">
                                <Zap className="w-3 h-3" />
                                Ready
                            </span>
                        )}
                        {isFixing && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-full text-orange-500">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Auto-fixing...
                            </span>
                        )}
                        {fixCount > 0 && (
                            <span className="px-2 py-1 bg-amber-500/10 rounded-full text-amber-400">
                                {fixCount} {fixCount === 1 ? 'fix' : 'fixes'}
                            </span>
                        )}
                    </div>

                    {/* My Projects Button */}
                    <button
                        onClick={() => navigate('/projects')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
                    >
                        <FolderOpen className="w-4 h-4" />
                        My Projects
                    </button>

                    <span className="text-xs text-gray-500">Powered by LangGraph + Gemini</span>
                </div>
            </header>

            {/* Planning Review Overlay */}
            {showPlanningReview && blueprint && (
                <PlanningReview
                    blueprint={blueprint}
                    onApprove={handleApproveAndContinue}
                    onReject={handleRejectPlan}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex overflow-hidden">
                    {/* Chat Panel - Left Side */}
                    <div className="w-1/2 flex flex-col border-r border-[#2e2e2e]">
                        <ChatPanel
                            messages={messages}
                            phases={phases}
                            status={status}
                            statusMessage={statusMessage}
                            onSendMessage={handleSendMessage}
                            onStop={handleStop}
                            isProcessing={isProcessing}
                            isCreating={isCreating}
                        />
                    </div>

                    {/* Preview Panel - Right Side */}
                    <div className="w-1/2 flex flex-col">
                        <PreviewPanel
                            files={fileTree}
                            selectedFile={selectedFile}
                            onSelectFile={handleSelectFile}
                            onFileChange={handleFileChange}
                            previewUrl={wcPreviewUrl || undefined}
                            isLoading={isProcessing || isInstalling || isBooting}
                            totalFiles={files.length}
                            onDownload={handleDownload}
                            terminalOutput={terminalOutput}
                            isInstalling={isInstalling}
                            isBooting={isBooting}
                        />
                    </div>
                </div>

                {/* Terminal Panel - Bottom - COMMENTED OUT */}
                {/* <WebContainerTerminal
                    terminalOutput={terminalOutput}
                    onCommand={runCommand}
                    onKill={killProcess}
                    isRunning={isRunning}
                /> */}
            </div>
        </div>
    );
};

export default AgentBuilder;
