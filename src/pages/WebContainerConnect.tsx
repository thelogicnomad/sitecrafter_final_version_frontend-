import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink, Settings, ArrowLeft, Chrome, Globe } from 'lucide-react';

/**
 * WebContainer Connect Handler
 * 
 * This component handles the WebContainer "Connect to Project" redirect.
 * When a user opens a WebContainer preview URL in a new tab, WebContainer
 * redirects to this page to reconnect the session.
 * 
 * The user can either:
 * 1. Click the redirect button to go back to the project
 * 2. Configure their browser to avoid this screen in the future
 */
export const WebContainerConnect = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);
    const [showInstructions, setShowInstructions] = useState(false);

    // Get the project ID from localStorage
    const lastProjectId = localStorage.getItem('lastProjectId');

    useEffect(() => {
        // Countdown timer
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (lastProjectId) {
                        navigate(`/agent?project=${lastProjectId}`);
                    } else {
                        navigate('/agent');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate, lastProjectId]);

    const handleGoBack = () => {
        if (lastProjectId) {
            navigate(`/agent?project=${lastProjectId}`);
        } else {
            navigate('/agent');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-8">
            <div className="max-w-2xl w-full text-center">
                {/* Header */}
                <div className="mb-8">
                    <Loader2 className="w-16 h-16 text-amber-500 animate-spin mx-auto mb-4" />
                    <h1 className="text-3xl font-bold mb-2">Connecting to WebContainer...</h1>
                    <p className="text-gray-400 text-lg">
                        WebContainer previews require an active session.
                    </p>
                </div>

                {/* Auto-redirect notice */}
                <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 mb-6">
                    <p className="text-gray-300 mb-4">
                        Redirecting you to your project in <span className="text-amber-500 font-bold text-xl">{countdown}</span> seconds...
                    </p>
                    <button
                        onClick={handleGoBack}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go to Project Now
                    </button>
                </div>

                {/* Why this happens */}
                <div className="text-left bg-[#141414] border border-[#2e2e2e] rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Why does this happen?
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">
                        WebContainer runs a full Node.js environment in your browser. When you open the preview
                        in a new tab, the browser's third-party cookie restrictions prevent the preview from
                        connecting to your active session.
                    </p>

                    <button
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1"
                    >
                        <Settings className="w-4 h-4" />
                        {showInstructions ? 'Hide browser configuration' : 'Show how to fix this permanently'}
                    </button>
                </div>

                {/* Browser configuration instructions */}
                {showInstructions && (
                    <div className="text-left bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                            <Chrome className="w-5 h-5" />
                            Configure Chrome/Edge to allow WebContainer previews
                        </h3>

                        <ol className="text-gray-300 text-sm space-y-3 list-decimal list-inside">
                            <li>
                                Open <code className="bg-[#2e2e2e] px-2 py-1 rounded text-amber-400">chrome://settings/cookies</code> in your browser
                            </li>
                            <li>
                                Scroll to <strong>"Sites that can always use cookies"</strong>
                            </li>
                            <li>
                                Click <strong>"Add"</strong> and add these patterns:
                                <ul className="mt-2 ml-6 space-y-1">
                                    <li className="font-mono text-amber-400 text-xs">https://[*.]webcontainer.io</li>
                                    <li className="font-mono text-amber-400 text-xs">https://[*.]webcontainer-api.io</li>
                                    <li className="font-mono text-amber-400 text-xs">https://[*.]local-corp.webcontainer-api.io</li>
                                </ul>
                            </li>
                            <li>
                                Reload the page and the preview should work directly in new tabs!
                            </li>
                        </ol>

                        <div className="mt-4 pt-4 border-t border-blue-500/30">
                            <a
                                href="https://webcontainers.io/guides/browser-config"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Read official WebContainer documentation
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <p className="text-gray-600 text-xs">
                    Session ID: {sessionId || 'unknown'}
                </p>
            </div>
        </div>
    );
};

export default WebContainerConnect;
