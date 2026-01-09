import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState, useRef } from 'react';
import { Loader } from './Loader';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer | undefined;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const serverRef = useRef<any>(null);
  const [serverStarted, setServerStarted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function startDevServer() {
      if (!webContainer || serverStarted) return;
      
      try {
        setIsLoading(true);
        setError("");

        // Install dependencies only if needed
        if (!serverRef.current) {
          const installProcess = await webContainer.spawn('npm', ['install']);
          await installProcess.exit;
        }

        // Start dev server if not already running
        if (!serverRef.current) {
          serverRef.current = await webContainer.spawn('npm', ['run', 'dev']);
          
          // Handle server output
          serverRef.current.output.pipeTo(
            new WritableStream({
              write(data) {
                if (data.includes('Local:')) {
                  console.log('Dev server started:', data);
                }
              }
            })
          );
        }

        // Listen for server ready event
        webContainer.on('server-ready', (port, serverUrl) => {
          if (isMounted) {
            setUrl(serverUrl);
            setIsLoading(false);
            setServerStarted(true);
          }
        });

      } catch (err) {
        console.error('Error starting dev server:', err);
        if (isMounted) {
          setError("Failed to start preview server. Please try again.");
          setIsLoading(false);
        }
      }
    }

    startDevServer();

    return () => {
      isMounted = false;
    };
  }, [webContainer, serverStarted]);

  if (!webContainer) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="mb-2">Initializing WebContainer...</p>
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400">
        <div className="text-center">
          <p className="mb-2">{error}</p>
          <button 
            onClick={() => {
              serverRef.current = null;
              setServerStarted(false);
              setError("");
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
          <div className="text-center">
            <Loader />
            <p className="mt-4 text-gray-300">Starting preview server...</p>
          </div>
        </div>
      )}
      {url && (
        <iframe 
          src={url}
          className="w-full h-full border-0 rounded-lg"
          title="Preview"
          key={url}
        />
      )}
    </div>
  );
}