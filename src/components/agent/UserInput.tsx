import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Mic, Square, StopCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface UserInputProps {
    onSend: (message: string) => void;
    onStop?: () => void;
    isProcessing?: boolean;
    placeholder?: string;
}

export const UserInput: React.FC<UserInputProps> = ({
    onSend,
    onStop,
    isProcessing = false,
    placeholder = 'Describe the website you want to build...'
}) => {
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [error, setError] = useState('');
    const [volume, setVolume] = useState(0);

    const recognitionRef = useRef<any>(null);
    const isStartingRef = useRef(false);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();

    const SpeechRecognition = typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    const isSupported = !!SpeechRecognition;

    // Initialize speech recognition once
    useEffect(() => {
        if (!isSupported) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.language = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
            setError('');
            isStartingRef.current = false;
        };

        recognition.onresult = (event: any) => {
            let interim = '';
            let hasFinal = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    setMessage(prev => {
                        const newMsg = prev ? prev + ' ' + transcript : transcript;
                        return newMsg.trim();
                    });
                    hasFinal = true;
                } else {
                    interim += transcript;
                }
            }

            if (!hasFinal) {
                setInterimText(interim);
            } else {
                setInterimText('');
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
            isStartingRef.current = false;
        };

        recognition.onerror = (event: any) => {
            isStartingRef.current = false;

            const errorMessages: { [key: string]: string } = {
                'no-speech': 'No speech detected. Try again.',
                'audio-capture': 'No microphone access.',
                'network': 'Network error.',
                'service-not-allowed': 'Service not allowed.',
                'aborted': ''
            };

            if (event.error !== 'aborted') {
                setError(errorMessages[event.error] || `Error: ${event.error}`);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isSupported]);

    // Volume detection
    const startVolumeDetection = async () => {
        try {
            if (!mediaStreamRef.current) {
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true }
                });
            }

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const context = audioContextRef.current;
            if (context.state === 'suspended') {
                await context.resume();
            }

            const source = context.createMediaStreamSource(mediaStreamRef.current);
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const detectVolume = () => {
                if (analyserRef.current && isRecording) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setVolume(Math.min(100, (average / 255) * 100));
                    animationFrameRef.current = requestAnimationFrame(detectVolume);
                }
            };

            detectVolume();
        } catch (err: any) {
            setError('Microphone access denied');
        }
    };

    const stopVolumeDetection = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setVolume(0);
    };

    const startRecording = async () => {
        if (!isSupported) {
            setError('Speech recognition not supported');
            return;
        }

        if (isRecording || isStartingRef.current) return;

        isStartingRef.current = true;
        setError('');
        setInterimText('');

        try {
            await startVolumeDetection();

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (err: any) {
                    if (err.message.includes('already started')) {
                        recognitionRef.current.abort();
                        setTimeout(() => {
                            if (recognitionRef.current) {
                                recognitionRef.current.start();
                            }
                        }, 100);
                    }
                }
            }
        } catch (err: any) {
            isStartingRef.current = false;
            setError(err.message || 'Failed to start recording');
        }
    };

    const stopRecording = () => {
        stopVolumeDetection();

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore
            }
        }

        if (interimText.trim()) {
            setMessage(prev => (prev ? prev + ' ' : '') + interimText.trim());
        }

        setIsRecording(false);
        setInterimText('');
    };

    const handleSend = () => {
        if (isRecording) {
            stopRecording();
        }

        const finalMsg = (message + ' ' + interimText).trim();
        if (finalMsg && !isProcessing) {
            onSend(finalMsg);
            setMessage('');
            setInterimText('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const displayText = message + (interimText ? ' ' + interimText : '');

    return (
        <div className="border-t border-[#2e2e2e] bg-[#0a0a0a] p-4">
            <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                    <textarea
                        value={displayText}
                        onChange={(e) => {
                            if (!isRecording) {
                                setMessage(e.target.value);
                                // Auto-resize textarea
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={isProcessing}
                        readOnly={isRecording}
                        rows={1}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-3.5 pr-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 resize-none transition-all duration-200 text-sm leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                        style={{
                            minHeight: '52px',
                            maxHeight: '150px',
                        }}
                    />
                    {displayText.length > 100 && (
                        <span className="absolute bottom-2 right-3 text-[10px] text-gray-600">
                            {displayText.length} chars
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isProcessing ? (
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={onStop}
                            className="!rounded-xl"
                        >
                            <StopCircle className="w-5 h-5 text-red-400" />
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleSend}
                            disabled={!displayText.trim()}
                            className="!rounded-xl"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </div>

            {isSupported && (
                <div className="flex items-center gap-3 mt-3 px-1">
                    {isRecording ? (
                        <>
                            <button
                                type="button"
                                onClick={stopRecording}
                                className="text-xs flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors font-medium"
                            >
                                <Square className="w-3 h-3 fill-current" />
                                Stop
                            </button>

                            {/* Volume meter */}
                            <div className="flex items-center gap-1 h-4">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 rounded-full transition-all"
                                        style={{
                                            height: `${4 + i * 2}px`,
                                            opacity: volume > (i * 20) ? 1 : 0.3,
                                            backgroundColor: volume > (i * 20)
                                                ? i < 2 ? '#22c55e' : i < 3 ? '#eab308' : '#ef4444'
                                                : '#4b5563'
                                        }}
                                    />
                                ))}
                            </div>

                            <span className="text-xs text-red-400 flex items-center gap-1.5 ml-auto">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                Listening...
                            </span>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={startRecording}
                            disabled={isProcessing}
                            className="text-xs flex items-center gap-1.5 text-gray-500 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            <Mic className="w-3.5 h-3.5" />
                            Voice
                        </button>
                    )}

                    {error && (
                        <span className="text-xs text-red-500 ml-auto">{error}</span>
                    )}
                </div>
            )}
        </div>
    );
};