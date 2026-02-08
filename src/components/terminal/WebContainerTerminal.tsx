import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';
import { ChevronUp, ChevronDown, Trash2, Terminal as TerminalIcon, Square } from 'lucide-react';

interface WebContainerTerminalProps {
    terminalOutput: string[];
    onCommand?: (command: string) => void;
    onKill?: () => void;
    isRunning?: boolean;
}

export const WebContainerTerminal: React.FC<WebContainerTerminalProps> = ({
    terminalOutput,
    onCommand,
    onKill,
    isRunning = false
}) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const inputBufferRef = useRef('');
    const lastOutputIndexRef = useRef(0);
    const isInitializedRef = useRef(false);

    // Initialize xterm
    useEffect(() => {
        if (!terminalRef.current || isInitializedRef.current) return;

        const term = new Terminal({
            theme: {
                background: '#1a1a2e',
                foreground: '#e4e4e7',
                cursor: '#22d3ee',
                cursorAccent: '#1a1a2e',
                selectionBackground: '#3b3b5c',
                black: '#1a1a2e',
                red: '#f87171',
                green: '#4ade80',
                yellow: '#fbbf24',
                blue: '#60a5fa',
                magenta: '#c084fc',
                cyan: '#22d3ee',
                white: '#e4e4e7',
                brightBlack: '#71717a',
                brightRed: '#fca5a5',
                brightGreen: '#86efac',
                brightYellow: '#fcd34d',
                brightBlue: '#93c5fd',
                brightMagenta: '#d8b4fe',
                brightCyan: '#67e8f9',
                brightWhite: '#fafafa',
            },
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.3,
            cursorBlink: true,
            cursorStyle: 'bar',
            scrollback: 5000,
            convertEol: true,
            rows: 12,
            cols: 80,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(terminalRef.current);

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        isInitializedRef.current = true;

        // Fit after a delay to ensure container is rendered
        const fitTimer = setTimeout(() => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.warn('Fit failed:', e);
            }
        }, 200);

        // Write initial message
        term.writeln('\x1b[36m[WebContainer Terminal]\x1b[0m Ready - Type commands below');
        term.write('\x1b[32m$ \x1b[0m');

        // Write any existing output
        if (terminalOutput.length > 0) {
            terminalOutput.forEach(line => {
                term.writeln(colorLine(line));
            });
            lastOutputIndexRef.current = terminalOutput.length;
            term.write('\x1b[32m$ \x1b[0m');
        }

        // Handle user input
        term.onData((data) => {
            // Ctrl+C
            if (data === '\x03') {
                if (onKill) {
                    term.write('^C\r\n');
                    term.write('\x1b[32m$ \x1b[0m');
                    onKill();
                }
                inputBufferRef.current = '';
                return;
            }

            // Enter
            if (data === '\r') {
                term.write('\r\n');
                const cmd = inputBufferRef.current.trim();
                if (cmd && onCommand) {
                    onCommand(cmd);
                }
                inputBufferRef.current = '';
                setTimeout(() => term.write('\x1b[32m$ \x1b[0m'), 100);
                return;
            }

            // Backspace
            if (data === '\x7f' || data === '\b') {
                if (inputBufferRef.current.length > 0) {
                    inputBufferRef.current = inputBufferRef.current.slice(0, -1);
                    term.write('\b \b');
                }
                return;
            }

            // Regular printable character
            if (data >= ' ' && data <= '~') {
                inputBufferRef.current += data;
                term.write(data);
            }
        });

        // ResizeObserver for proper fitting
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current && !isCollapsed) {
                try {
                    fitAddonRef.current.fit();
                } catch (e) {
                    // Ignore fit errors
                }
            }
        });

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        return () => {
            clearTimeout(fitTimer);
            resizeObserver.disconnect();
            term.dispose();
            xtermRef.current = null;
            isInitializedRef.current = false;
        };
    }, []);

    // Helper to color lines
    const colorLine = (line: string): string => {
        if (line.includes('error') || line.includes('Error') || line.includes('ERR!')) {
            return `\x1b[31m${line}\x1b[0m`;
        } else if (line.includes('warning') || line.includes('Warning') || line.includes('WARN')) {
            return `\x1b[33m${line}\x1b[0m`;
        } else if (line.includes('success') || line.includes('ready') || line.includes('compiled') || line.includes('Ready')) {
            return `\x1b[32m${line}\x1b[0m`;
        } else if (line.startsWith('$') || line.startsWith('>')) {
            return `\x1b[36m${line}\x1b[0m`;
        }
        return line;
    };

    // Fit on collapse toggle
    useEffect(() => {
        if (!isCollapsed && fitAddonRef.current) {
            setTimeout(() => {
                try {
                    fitAddonRef.current?.fit();
                } catch (e) {
                    // Ignore
                }
            }, 150);
        }
    }, [isCollapsed]);

    // Write new terminal output AND sync session history
    useEffect(() => {
        if (!xtermRef.current || !isInitializedRef.current) return;

        // If lastOutputIndexRef is 0 and we have output, write all history
        if (lastOutputIndexRef.current === 0 && terminalOutput.length > 0) {
            xtermRef.current.writeln('\x1b[36m--- Session History ---\x1b[0m');
            terminalOutput.forEach(line => {
                xtermRef.current?.writeln(colorLine(line));
            });
            xtermRef.current.writeln('\x1b[36m--- End History ---\x1b[0m');
            lastOutputIndexRef.current = terminalOutput.length;
        } else {
            // Write only new output
            const newOutput = terminalOutput.slice(lastOutputIndexRef.current);
            if (newOutput.length > 0) {
                newOutput.forEach(line => {
                    xtermRef.current?.writeln(colorLine(line));
                });
                lastOutputIndexRef.current = terminalOutput.length;
            }
        }
    }, [terminalOutput]);

    const clearTerminal = useCallback(() => {
        if (xtermRef.current) {
            xtermRef.current.clear();
            xtermRef.current.writeln('\x1b[36m[Terminal cleared]\x1b[0m');
            xtermRef.current.write('\x1b[32m$ \x1b[0m');
        }
        lastOutputIndexRef.current = terminalOutput.length;
        inputBufferRef.current = '';
    }, [terminalOutput.length]);

    return (
        <div className={`flex flex-col bg-[#1a1a2e] border-t border-[#2e2e4a] transition-all duration-300 ${isCollapsed ? 'h-10' : 'h-56'}`}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#16162a] border-b border-[#2e2e4a] shrink-0">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-medium text-slate-300">Terminal</span>
                    {isRunning && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 rounded text-[10px] text-emerald-400">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            Running
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isRunning && onKill && (
                        <button
                            onClick={onKill}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Stop process (Ctrl+C)"
                        >
                            <Square className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={clearTerminal}
                        className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                        title="Clear terminal"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Terminal Body - Fixed height for xterm */}
            {!isCollapsed && (
                <div
                    ref={terminalRef}
                    className="flex-1 overflow-hidden"
                    style={{
                        height: 'calc(100% - 36px)',
                        padding: '4px 8px',
                    }}
                />
            )}
        </div>
    );
};

export default WebContainerTerminal;

