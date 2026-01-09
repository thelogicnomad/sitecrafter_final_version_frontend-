/**
 * Error Reporter - Injected into user projects to capture runtime errors
 * This script runs in the preview iframe and sends errors to parent window
 */

export function getErrorReporterScript(): string {
    return `
<script>
(function() {
    'use strict';
    
    // Throttle error reporting to prevent spam
    let lastErrorTime = 0;
    const ERROR_THROTTLE_MS = 2000;
    
    function canReportError() {
        const now = Date.now();
        if (now - lastErrorTime < ERROR_THROTTLE_MS) {
            return false;
        }
        lastErrorTime = now;
        return true;
    }
    
    function sendErrorToParent(errorData) {
        if (!canReportError()) return;
        
        try {
            window.parent.postMessage({
                type: 'RUNTIME_ERROR',
                ...errorData,
                timestamp: Date.now()
            }, '*');
        } catch (e) {
            console.error('Failed to send error to parent:', e);
        }
    }
    
    // Capture global JavaScript errors
    window.addEventListener('error', function(event) {
        const errorData = {
            message: event.message,
            stack: event.error?.stack || '',
            filename: event.filename || '',
            lineno: event.lineno || 0,
            colno: event.colno || 0,
            errorType: 'GLOBAL_ERROR'
        };
        
        console.error('🔴 Runtime Error:', errorData);
        sendErrorToParent(errorData);
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        const errorData = {
            message: event.reason?.message || String(event.reason),
            stack: event.reason?.stack || '',
            errorType: 'UNHANDLED_REJECTION'
        };
        
        console.error('🔴 Unhandled Promise Rejection:', errorData);
        sendErrorToParent(errorData);
    });
    
    // Intercept console.error to catch React error boundary errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
        // Call original first
        originalConsoleError.apply(console, args);
        
        // Check if this is a React error
        const errorText = args.map(arg => String(arg)).join(' ');
        
        if (errorText.includes('error boundary') || 
            errorText.includes('The above error occurred') ||
            errorText.includes('React will try to recreate')) {
            
            // Extract stack trace from arguments
            let stack = '';
            for (const arg of args) {
                if (typeof arg === 'string' && (arg.includes('at ') || arg.includes('http'))) {
                    stack = arg;
                    break;
                }
            }
            
            const errorData = {
                message: errorText,
                stack: stack,
                errorType: 'REACT_ERROR_BOUNDARY',
                isReactError: true
            };
            
            console.log('🔴 React Error Detected:', errorData);
            sendErrorToParent(errorData);
        }
    };
    
    console.log('✅ Error Reporter initialized');
})();
</script>
`.trim();
}

/**
 * Parse stack trace to extract file path and line number
 * Enhanced to handle WebContainer URLs and React error messages
 */
export function parseStackTrace(stack: string, message?: string): { filePath: string | null; lineNumber: number | null } {
    const combinedText = `${message || ''}\n${stack || ''}`;

    if (!combinedText.trim()) return { filePath: null, lineNumber: null };

    // Pattern 1: Direct /src/ path extraction from WebContainer URLs
    // Match: https://...io/src/components/features/StatCard.tsx:20:3
    const srcPathMatch = combinedText.match(/\.io\/src\/([^\s:)]+\.tsx?):(\\d+)/);
    if (srcPathMatch) {
        return {
            filePath: 'src/' + srcPathMatch[1],
            lineNumber: srcPathMatch[2] ? parseInt(srcPathMatch[2], 10) : null
        };
    }

    // Pattern 2: Extract component name from "Check the render method of `ComponentName`"
    const renderMethodMatch = combinedText.match(/Check the render method of [`']?(\w+)[`']?/i);
    if (renderMethodMatch) {
        const componentName = renderMethodMatch[1];

        // Try to find the component file in the combined text
        const componentFilePattern = new RegExp(`at ${componentName}\\s*\\([^)]*\\/src\\/([^\\s:)]+\\.tsx?):(\\d+)`);
        const componentFileMatch = combinedText.match(componentFilePattern);
        if (componentFileMatch) {
            return {
                filePath: 'src/' + componentFileMatch[1],
                lineNumber: componentFileMatch[2] ? parseInt(componentFileMatch[2], 10) : null
            };
        }

        // Fallback: construct likely path from component name
        return {
            filePath: `src/components/features/${componentName}.tsx`,
            lineNumber: null
        };
    }

    // Pattern 3: React component format
    // at Component (https://.../src/components/Component.tsx:24:31)
    const reactMatch = combinedText.match(/at\s+\w+\s+\(https?:\/\/[^)]+\/(src\/[^:)]+):(\d+):\d+\)/);
    if (reactMatch) {
        return {
            filePath: reactMatch[1],
            lineNumber: parseInt(reactMatch[2], 10)
        };
    }

    // Pattern 4: Direct URL format
    // at https://.../src/App.tsx:45:12
    const urlMatch = combinedText.match(/at\s+https?:\/\/[^/]+\/(src\/[^:)]+):(\d+):\d+/);
    if (urlMatch) {
        return {
            filePath: urlMatch[1],
            lineNumber: parseInt(urlMatch[2], 10)
        };
    }

    // Pattern 5: Simple path format
    const simpleMatch = combinedText.match(/(src\/[\w\/.-]+\.(?:tsx?|jsx?))/);
    if (simpleMatch) {
        return {
            filePath: simpleMatch[1],
            lineNumber: null
        };
    }

    return { filePath: null, lineNumber: null };
}
