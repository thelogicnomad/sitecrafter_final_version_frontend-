import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree } from '@webcontainer/api';
import { getErrorReporterScript } from '../utils/errorReporter';
import { Zap, Loader2, X, Check } from 'lucide-react';

interface WebContainerContextType {
    isBooting: boolean;
    isInstalling: boolean;
    isRunning: boolean;
    previewUrl: string | null;
    error: string | null;
    terminalOutput: string[];
    isPreWarmed: boolean;
    isPreWarming: boolean;
    mountFiles: (files: FileSystemTree) => Promise<void>;
    startDevServer: () => Promise<void>;
    updateFile: (path: string, content: string) => Promise<void>;
    reset: () => void;
    runCommand: (command: string) => Promise<void>;
    killProcess: () => void;
}

const WebContainerContext = createContext<WebContainerContextType | null>(null);

// Singleton WebContainer instance
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let preWarmPromise: Promise<void> | null = null;
let isPreWarmedFlag = false;

// Base package.json with 16 common dependencies
const BASE_PACKAGE_JSON = {
    name: 'preview-project',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
        dev: 'vite --host',
        build: 'vite build',
    },
    dependencies: {
        'react': '^18.3.1',
        'react-dom': '^18.3.1',
        'react-router-dom': '^7.1.1',
        'framer-motion': '^11.14.4',
        'lucide-react': '^0.460.0',
        'clsx': '^2.1.1',
        'tailwind-merge': '^2.5.5',
        'class-variance-authority': '^0.7.1',
        'axios': '^1.7.9',
        'zustand': '^5.0.2',
        'date-fns': '^4.1.0',
    },
    devDependencies: {
        '@vitejs/plugin-react': '^4.3.4',
        'vite': '^6.0.3',
        'typescript': '^5.7.2',
        '@types/react': '^18.3.12',
        '@types/react-dom': '^18.3.1',
        'tailwindcss': '^3.4.17',
        'postcss': '^8.4.49',
        'autoprefixer': '^10.4.20',
    },
};

const BASE_FILES: FileSystemTree = {
    'package.json': { file: { contents: JSON.stringify(BASE_PACKAGE_JSON, null, 2) } },
    'vite.config.ts': {
        file: {
            contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })`,
        },
    },
    'index.html': {
        file: {
            contents: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Preview</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>`,
        },
    },
    'tailwind.config.js': { file: { contents: `export default { content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], theme: { extend: {} }, plugins: [] }` } },
    'postcss.config.js': { file: { contents: `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }` } },
    'src': {
        directory: {
            'main.tsx': { file: { contents: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nimport './index.css'\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)` } },
            'App.tsx': { file: { contents: `export default function App() { return <div className="p-4 text-white bg-zinc-900 min-h-screen">Loading...</div> }` } },
            'index.css': { file: { contents: `@tailwind base;\n@tailwind components;\n@tailwind utilities;` } },
        },
    },
};

export const WebContainerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isBooting, setIsBooting] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [isPreWarmed, setIsPreWarmed] = useState(isPreWarmedFlag);
    const [isPreWarming, setIsPreWarming] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const processRef = useRef<any>(null);

    const appendOutput = useCallback((line: string) => {
        if (line.includes('[0K') || line.includes('[1G') || line.trim().length < 2) return;
        setTerminalOutput(prev => [...prev.slice(-100), line]);
    }, []);

    // Boot WebContainer (singleton)
    const boot = useCallback(async (): Promise<WebContainer> => {
        if (webcontainerInstance) return webcontainerInstance;
        if (bootPromise) return bootPromise;

        bootPromise = (async () => {
            setIsBooting(true);
            setError(null);
            appendOutput('⚡ Booting WebContainer...');

            try {
                const instance = await WebContainer.boot({
                    coep: 'credentialless'  // Enables cross-tab previews without "Connect to Project"
                });
                webcontainerInstance = instance;

                instance.on('server-ready', (_port, url) => {
                    appendOutput(`🚀 Server ready at ${url}`);
                    setPreviewUrl(url);
                    setIsRunning(true);
                    setIsInstalling(false);

                    // Extract session ID from URL for cross-tab communication
                    // URL format: https://xxx--port--sessionId.local-credentialless.webcontainer-api.io
                    const urlMatch = url.match(/--(\w+)\.local-credentialless/);
                    const sessionId = urlMatch ? urlMatch[1] : 'latest';

                    // Store preview URL in localStorage for cross-tab access
                    localStorage.setItem(`webcontainer_preview_${sessionId}`, url);
                    localStorage.setItem('webcontainer_latest_preview', url);
                    localStorage.setItem('webcontainer_session_id', sessionId);
                    console.log(`📡 Preview URL stored for session: ${sessionId}`);

                    // Broadcast to other tabs using BroadcastChannel
                    if ('BroadcastChannel' in window) {
                        const channel = new BroadcastChannel('webcontainer_session');
                        channel.postMessage({
                            type: 'PREVIEW_URL_AVAILABLE',
                            sessionId: sessionId,
                            previewUrl: url
                        });

                        // Also listen for requests from other tabs
                        channel.onmessage = (event) => {
                            if (event.data.type === 'PREVIEW_URL_REQUEST') {
                                console.log('📡 Received preview URL request, responding...');
                                channel.postMessage({
                                    type: 'PREVIEW_URL_RESPONSE',
                                    sessionId: sessionId,
                                    previewUrl: url
                                });
                            }
                        };
                    }
                });

                appendOutput('✅ WebContainer booted');
                setIsBooting(false);
                return instance;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to boot';
                setError(message);
                appendOutput(`❌ Error: ${message}`);
                setIsBooting(false);
                bootPromise = null;
                throw err;
            }
        })();

        return bootPromise;
    }, [appendOutput]);

    // Pre-warm: Install base 16 packages on site load
    const preWarm = useCallback(async () => {
        if (isPreWarmedFlag || preWarmPromise) return preWarmPromise;

        preWarmPromise = (async () => {
            setIsPreWarming(true);
            setShowToast(true);

            try {
                const instance = await boot();
                appendOutput('📦 Installing 16 base packages...');

                await instance.mount(BASE_FILES);

                const installProcess = await instance.spawn('npm', [
                    'install', '--prefer-offline', '--no-audit', '--no-fund', '--legacy-peer-deps',
                ]);

                installProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        data.split('\n').filter(Boolean).forEach(line => appendOutput(line));
                    }
                }));

                const exitCode = await installProcess.exit;
                if (exitCode !== 0) throw new Error('npm install failed');

                isPreWarmedFlag = true;
                setIsPreWarmed(true);
                appendOutput('✅ Base packages installed!');

                // Auto-hide toast after 3 seconds
                setTimeout(() => setShowToast(false), 3000);

            } catch (err) {
                appendOutput(`⚠️ Pre-warm error: ${err}`);
            } finally {
                setIsPreWarming(false);
            }
        })();

        return preWarmPromise;
    }, [boot, appendOutput]);

    // Start preWarm immediately on mount (global app load)
    useEffect(() => {
        preWarm();
    }, []);

    const mountFiles = useCallback(async (files: FileSystemTree) => {
        try {
            const instance = await boot();
            if (preWarmPromise && !isPreWarmedFlag) {
                appendOutput('⏳ Waiting for base setup...');
                await preWarmPromise;
            }
            appendOutput('📁 Mounting project files...');

            if (files['index.html']) {
                const indexHtmlEntry = files['index.html'];
                if ('file' in indexHtmlEntry && indexHtmlEntry.file && 'contents' in indexHtmlEntry.file) {
                    const originalHtml = indexHtmlEntry.file.contents;
                    const errorReporter = getErrorReporterScript();
                    const modifiedHtml = typeof originalHtml === 'string'
                        ? originalHtml.replace('</head>', `  ${errorReporter}\n  </head>`)
                        : originalHtml;
                    files['index.html'] = { file: { contents: modifiedHtml } };
                    appendOutput('Error reporter injected');
                }
            }

            // Check for additional packages in the mounted package.json
            const basePackages = new Set([
                ...Object.keys(BASE_PACKAGE_JSON.dependencies),
                ...Object.keys(BASE_PACKAGE_JSON.devDependencies)
            ]);

            let newPackages: string[] = [];
            if (files['package.json']) {
                const pkgEntry = files['package.json'];
                if ('file' in pkgEntry && pkgEntry.file && 'contents' in pkgEntry.file) {
                    try {
                        const contents = typeof pkgEntry.file.contents === 'string'
                            ? pkgEntry.file.contents
                            : new TextDecoder().decode(pkgEntry.file.contents);
                        const projectPkg = JSON.parse(contents);

                        // Find new dependencies
                        for (const [pkg, version] of Object.entries(projectPkg.dependencies || {})) {
                            if (!basePackages.has(pkg)) {
                                newPackages.push(`${pkg}@${version}`);
                            }
                        }
                        // Find new devDependencies
                        for (const [pkg, version] of Object.entries(projectPkg.devDependencies || {})) {
                            if (!basePackages.has(pkg)) {
                                newPackages.push(`${pkg}@${version}`);
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to parse package.json for dynamic packages:', e);
                    }
                }
            }

            await instance.mount(files);
            appendOutput('Files mounted');

            // Install additional packages if any were detected
            if (newPackages.length > 0) {
                appendOutput(`Installing ${newPackages.length} additional packages: ${newPackages.map(p => p.split('@')[0]).join(', ')}`);
                const addProcess = await instance.spawn('npm', [
                    'install', ...newPackages, '--prefer-offline', '--no-audit', '--no-fund', '--legacy-peer-deps'
                ]);

                addProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        data.split('\n').filter(Boolean).forEach(line => appendOutput(line));
                    }
                }));

                const exitCode = await addProcess.exit;
                if (exitCode === 0) {
                    appendOutput(`Additional packages installed successfully`);
                } else {
                    appendOutput(`Warning: Some packages may have failed to install`);
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Mount failed';
            setError(message);
            throw err;
        }
    }, [boot, appendOutput]);

    const startDevServer = useCallback(async () => {
        try {
            const instance = await boot();
            if (processRef.current) processRef.current.kill();

            setPreviewUrl(null);
            setIsInstalling(true);
            appendOutput('⚡ Installing project dependencies...');

            const installProcess = await instance.spawn('npm', [
                'install', '--prefer-offline', '--no-audit', '--no-fund', '--legacy-peer-deps',
            ]);

            installProcess.output.pipeTo(new WritableStream({
                write(data) {
                    data.split('\n').filter(Boolean).forEach(line => appendOutput(line));
                }
            }));

            await installProcess.exit;
            appendOutput('✅ Dependencies ready');
            appendOutput('🚀 Starting dev server...');

            const devProcess = await instance.spawn('npm', ['run', 'dev']);
            processRef.current = devProcess;

            devProcess.output.pipeTo(new WritableStream({
                write(data) {
                    data.split('\n').filter(Boolean).forEach(line => appendOutput(line));
                }
            }));

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start';
            setError(message);
            setIsInstalling(false);
        }
    }, [boot, appendOutput]);

    const updateFile = useCallback(async (path: string, content: string) => {
        try {
            const instance = await boot();
            await instance.fs.writeFile(path, content);
            appendOutput(`Updated: ${path}`);

            // Check if package.json was updated - detect and install new packages
            if (path === 'package.json' || path === '/package.json') {
                try {
                    const basePackages = new Set([
                        ...Object.keys(BASE_PACKAGE_JSON.dependencies),
                        ...Object.keys(BASE_PACKAGE_JSON.devDependencies)
                    ]);

                    const updatedPkg = JSON.parse(content);
                    const newPackages: string[] = [];

                    // Find new dependencies
                    for (const [pkg, version] of Object.entries(updatedPkg.dependencies || {})) {
                        if (!basePackages.has(pkg)) {
                            newPackages.push(`${pkg}@${version}`);
                        }
                    }
                    // Find new devDependencies
                    for (const [pkg, version] of Object.entries(updatedPkg.devDependencies || {})) {
                        if (!basePackages.has(pkg)) {
                            newPackages.push(`${pkg}@${version}`);
                        }
                    }

                    if (newPackages.length > 0) {
                        appendOutput(`Detected ${newPackages.length} new packages: ${newPackages.map(p => p.split('@')[0]).join(', ')}`);
                        appendOutput(`Installing new packages...`);

                        const addProcess = await instance.spawn('npm', [
                            'install', ...newPackages, '--prefer-offline', '--no-audit', '--no-fund', '--legacy-peer-deps'
                        ]);

                        addProcess.output.pipeTo(new WritableStream({
                            write(data) {
                                data.split('\n').filter(Boolean).forEach(line => appendOutput(line));
                            }
                        }));

                        const exitCode = await addProcess.exit;
                        if (exitCode === 0) {
                            appendOutput(`New packages installed successfully`);
                        } else {
                            appendOutput(`Warning: Some packages may have failed to install`);
                        }
                    }
                } catch (parseError) {
                    console.warn('Failed to parse package.json for new packages:', parseError);
                }
            }
        } catch (err) {
            appendOutput(`Failed to update ${path}: ${err}`);
        }
    }, [boot, appendOutput]);

    const reset = useCallback(() => {
        if (processRef.current) {
            processRef.current.kill();
            processRef.current = null;
        }
        setPreviewUrl(null);
        setIsRunning(false);
        setIsInstalling(false);
        setError(null);
        setTerminalOutput([]);
    }, []);

    // Kill the current running process (Ctrl+C equivalent)
    const killProcess = useCallback(() => {
        if (processRef.current) {
            processRef.current.kill();
            processRef.current = null;
            appendOutput('Process terminated');
            setIsRunning(false);
        }
    }, [appendOutput]);

    // Run an arbitrary command in WebContainer
    const runCommand = useCallback(async (command: string) => {
        try {
            const instance = await boot();
            appendOutput(`$ ${command}`);

            // Parse command into program and args
            const parts = command.trim().split(/\s+/);
            const program = parts[0];
            const args = parts.slice(1);

            const process = await instance.spawn(program, args);
            processRef.current = process;
            setIsRunning(true);

            process.output.pipeTo(new WritableStream({
                write(data) {
                    data.split('\n').filter(Boolean).forEach(line => appendOutput(line));
                }
            }));

            const exitCode = await process.exit;
            appendOutput(`Process exited with code ${exitCode}`);
            setIsRunning(false);
            processRef.current = null;
        } catch (err) {
            appendOutput(`Command failed: ${err}`);
            setIsRunning(false);
        }
    }, [boot, appendOutput]);

    useEffect(() => {
        return () => { if (processRef.current) processRef.current.kill(); };
    }, []);

    const value: WebContainerContextType = {
        isBooting, isInstalling, isRunning, previewUrl, error, terminalOutput,
        isPreWarmed, isPreWarming, mountFiles, startDevServer, updateFile, reset,
        runCommand, killProcess,
    };

    return (
        <WebContainerContext.Provider value={value} >
            {children}

            {/* Non-blocking Toast in Corner */}
            {
                showToast && (
                    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-5" >
                        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg shadow-xl overflow-hidden" >
                            {/* Header */}
                            < div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/10" >
                                <div className="flex items-center gap-2" >
                                    {
                                        isPreWarming ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                        ) : (
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        )}
                                    <span className="text-sm font-medium text-white" >
                                        {isPreWarming ? 'Warming Up...' : 'Ready!'}
                                    </span>
                                </div>
                                < button
                                    onClick={() => setShowToast(false)}
                                    className="p-1 hover:bg-white/10 rounded"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            </div>

                            {/* Progress */}
                            {
                                isPreWarming && (
                                    <div className="px-4 py-2" >
                                        <div className="h-1.5 bg-[#2e2e2e] rounded-full overflow-hidden" >
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(terminalOutput.length * 2, 95)}%` }
                                                }
                                            />
                                        </div>
                                        < p className="text-[10px] text-gray-500 mt-1" >
                                            Installing 16 packages for instant previews...
                                        </p>
                                    </div>
                                )}

                            {/* Success message */}
                            {
                                !isPreWarming && isPreWarmed && (
                                    <div className="px-4 py-2" >
                                        <p className="text-xs text-emerald-400 flex items-center gap-1" >
                                            <Zap className="w-3 h-3" />
                                            Previews will load instantly!
                                        </p>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                )}
        </WebContainerContext.Provider>
    );
};

export const useWebContainer = (): WebContainerContextType => {
    const context = useContext(WebContainerContext);
    if (!context) {
        throw new Error('useWebContainer must be used within WebContainerProvider');
    }
    return context;
};