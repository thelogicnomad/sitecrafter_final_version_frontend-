import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink, Settings, ArrowLeft, Chrome, Globe, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

/**
 * WebContainer Connect Handler
 * 
 * This component handles the WebContainer "Connect to Project" redirect.
 * It finds the stored preview URL and displays it in an iframe.
 */
export const WebContainerConnect = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'found' | 'not-found'>('connecting');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);
    const [countdown, setCountdown] = useState(5);

    const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

    // Get the project ID from localStorage
    const lastProjectId = localStorage.getItem('lastProjectId');

    // Try to find preview URL
    useEffect(() => {
        console.log('🔗 WebContainerConnect: Looking for preview, session:', sessionId);

        // Check localStorage for stored preview URL
        const storedPreview = localStorage.getItem(`webcontainer_preview_${sessionId}`);
        const latestPreview = localStorage.getItem('webcontainer_latest_preview');

        if (storedPreview) {
            console.log('✅ Found preview in localStorage:', storedPreview);
            setPreviewUrl(storedPreview);
            setConnectionStatus('found');
            return;
        }

        if (latestPreview) {
            console.log('✅ Found latest preview:', latestPreview);
            setPreviewUrl(latestPreview);
            setConnectionStatus('found');
            return;
        }

        // Try BroadcastChannel to request from other tabs
        if ('BroadcastChannel' in window) {
            console.log('📡 Requesting preview via BroadcastChannel...');
            broadcastChannelRef.current = new BroadcastChannel('webcontainer_session');

            broadcastChannelRef.current.onmessage = (event) => {
                if (event.data.type === 'PREVIEW_URL_RESPONSE' || event.data.type === 'PREVIEW_URL_AVAILABLE') {
                    console.log('✅ Received preview from other tab:', event.data.previewUrl);
                    setPreviewUrl(event.data.previewUrl);
                    setConnectionStatus('found');
                }
            };

            broadcastChannelRef.current.postMessage({
                type: 'PREVIEW_URL_REQUEST',
                sessionId: sessionId
            });
        }

        // Timeout after 2 seconds
        const timeout = setTimeout(() => {
            if (!previewUrl) {
                console.log('⏰ Timeout: No preview found');
                setConnectionStatus('not-found');
            }
        }, 2000);

        return () => {
            clearTimeout(timeout);
            broadcastChannelRef.current?.close();
        };
    }, [sessionId]);

    // Countdown for redirect when not found
    useEffect(() => {
        if (connectionStatus === 'not-found') {
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
        }
    }, [connectionStatus, navigate, lastProjectId]);

    const handleGoBack = () => {
        if (lastProjectId) {
            navigate(`/agent?project=${lastProjectId}`);
        } else {
            navigate('/agent');
        }
    };

    // FOUND: Show the preview in full-screen iframe
    if (connectionStatus === 'found' && previewUrl) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0a0a0a'
            }}>
                {/* Compact header bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    backgroundColor: '#141414',
                    borderBottom: '1px solid #2e2e2e',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle style={{ width: 18, height: 18, color: '#10b981' }} />
                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Preview Connected</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handleGoBack}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: '#2e2e2e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: 13,
                                cursor: 'pointer'
                            }}
                        >
                            <ArrowLeft style={{ width: 14, height: 14 }} />
                            Back to Editor
                        </button>
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: '#d97706',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: 13,
                                textDecoration: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <ExternalLink style={{ width: 14, height: 14 }} />
                            Open Direct
                        </a>
                    </div>
                </div>

                {/* Full-height iframe */}
                <iframe
                    src={previewUrl}
                    title="WebContainer Preview"
                    style={{
                        flex: 1,
                        width: '100%',
                        border: 'none',
                        backgroundColor: '#fff'
                    }}
                />
            </div>
        );
    }

    // CONNECTING: Show loading state
    if (connectionStatus === 'connecting') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-8">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <h1 className="text-xl font-bold mb-2">Connecting to Preview...</h1>
                <p className="text-gray-400 text-sm">Session: {sessionId}</p>
            </div>
        );
    }

    // NOT FOUND: Show redirect to project
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-8">
            <div className="max-w-2xl w-full text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Preview Session Not Found</h1>
                <p className="text-gray-400 mb-6">
                    The WebContainer session may have ended. Redirecting you back to your project...
                </p>

                <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 mb-6">
                    <p className="text-gray-300 mb-4">
                        Redirecting in <span className="text-amber-500 font-bold text-xl">{countdown}</span> seconds...
                    </p>
                    <button
                        onClick={handleGoBack}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go to Project Now
                    </button>
                </div>

                {/* Browser config instructions */}
                <div className="text-left bg-[#141414] border border-[#2e2e2e] rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Why does this happen?
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">
                        WebContainer sessions only exist in the original browser tab. To view previews in new tabs,
                        you need to configure your browser to allow third-party cookies for WebContainer domains.
                    </p>

                    <button
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1"
                    >
                        <Settings className="w-4 h-4" />
                        {showInstructions ? 'Hide instructions' : 'Show how to fix this'}
                    </button>

                    {showInstructions && (
                        <div className="mt-4 pt-4 border-t border-[#2e2e2e]">
                            <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                                <li>Go to <code className="bg-[#2e2e2e] px-1.5 py-0.5 rounded text-amber-400 text-xs">chrome://settings/cookies</code></li>
                                <li>Add to "Sites that can always use cookies":
                                    <ul className="ml-5 mt-1 space-y-0.5">
                                        <li className="font-mono text-amber-400 text-xs">[*.]webcontainer-api.io</li>
                                    </ul>
                                </li>
                                <li>Check "Including third-party cookies"</li>
                            </ol>
                        </div>
                    )}
                </div>

                <p className="text-gray-600 text-xs mt-4">Session ID: {sessionId}</p>
            </div>
        </div>
    );
};

export default WebContainerConnect;
