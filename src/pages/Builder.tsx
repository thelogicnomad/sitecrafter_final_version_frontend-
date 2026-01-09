import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../hooks/types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';
import { Sparkles, Code2, Eye } from 'lucide-react';
import { DownloadButton } from '../components/DownloadButton';

export function Builder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { prompt, originalRequirements, blueprint } = location.state as {
    prompt: string;
    originalRequirements?: string;
    blueprint?: any;
  };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{ role: "user" | "assistant", content: string; }[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [useLangGraphMode, setUseLangGraphMode] = useState(true); // Use LangGraph for better code generation

  const handleCodeChange = useCallback((newContent: string) => {
    if (!selectedFile) return;

    setFiles(prevFiles => {
      const updateFileContent = (items: FileItem[]): FileItem[] => {
        return items.map(item => {
          if (item.path === selectedFile.path) {
            return { ...item, content: newContent };
          }
          if (item.type === 'folder' && item.children) {
            return {
              ...item,
              children: updateFileContent(item.children)
            };
          }
          return item;
        });
      };

      return updateFileContent(prevFiles);
    });
  }, [selectedFile]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({ status }) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? [];
        let currentFileStructure = [...originalFiles];
        let finalAnswerRef = currentFileStructure;

        let currentFolder = ""
        while (parsedPath.length) {
          currentFolder = `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);

          if (!parsedPath.length) {
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
          } else {
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }

            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }
    })

    if (updateHappened) {
      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => ({
        ...s,
        status: "completed"
      })))
    }
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};

      const processFile = (file: FileItem, isRootFolder: boolean) => {
        if (file.type === 'folder') {
          mountStructure[file.name] = {
            directory: file.children ?
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              )
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }

        return mountStructure[file.name];
      };

      files.forEach(file => processFile(file, true));

      return mountStructure;
    };

    const mountStructure = createMountStructure(files);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  async function init() {
    try {
      // Check if this is a fullstack project
      const isFullstack = blueprint?.projectType === 'fullstack';

      if (isFullstack) {
        console.log('[Builder] FULLSTACK PROJECT DETECTED');
        console.log('[Builder] Backend context:', blueprint.backendContext?.length || 0, 'chars');
        console.log('[Builder] Frontend context:', blueprint.frontendContext?.length || 0, 'chars');

        setLoading(true);

        // TEST: Call separate build endpoint (no backend context sharing)
        const projectId = `project_${Date.now()}`;
        console.log('[Builder] 🧪 TESTING SEPARATE GENERATION (no backend context)');
        const fullstackResponse = await axios.post(`${BACKEND_URL}/build/fullstack-complete`, {
          backendContext: blueprint.backendContext,
          frontendContext: blueprint.frontendContext,
          projectId: projectId
        });

        setLoading(false);

        // Parse backend code
        const backendCode = fullstackResponse.data.backend;
        const frontendCode = fullstackResponse.data.frontend;

        console.log('[Builder] Backend code received:', backendCode?.length || 0, 'chars');
        console.log('[Builder] Frontend code received:', frontendCode?.length || 0, 'chars');

        // Debug: Show first 500 chars of each
        console.log('[Builder] Backend preview:', backendCode?.substring(0, 500));
        console.log('[Builder] Frontend preview:', frontendCode?.substring(0, 500));

        // Parse both responses and combine steps
        const backendSteps = parseXml(backendCode || '');
        const frontendSteps = parseXml(frontendCode || '');

        console.log('[Builder] Backend steps parsed:', backendSteps.length);
        console.log('[Builder] Frontend steps parsed:', frontendSteps.length);

        // Prefix backend steps with backend/ folder (both title AND path)
        const prefixedBackendSteps = backendSteps.map((step: Step) => {
          // Skip modifying the first step if it's the artifact title
          if (step.id === 1 && step.title && !step.path) {
            return { ...step, title: 'Backend Server' };
          }

          let newTitle = step.title;
          let newPath = step.path;

          // Handle title prefixing
          if (newTitle && !newTitle.includes('backend/')) {
            // Extract "Create X" pattern and prefix the file path
            const createMatch = newTitle.match(/^Create (.+)$/);
            if (createMatch) {
              newTitle = `Create backend/${createMatch[1]}`;
            } else {
              newTitle = `backend/${newTitle}`;
            }
          }

          // Handle path prefixing
          if (newPath && !newPath.startsWith('backend/')) {
            newPath = `backend/${newPath}`;
          }

          return { ...step, title: newTitle, path: newPath };
        });

        // Prefix frontend steps with frontend/ folder (both title AND path)
        const prefixedFrontendSteps = frontendSteps.map((step: Step, idx: number) => {
          // Skip modifying the first step if it's the artifact title
          if (step.id === 1 && step.title && !step.path) {
            return { ...step, id: backendSteps.length + idx + 1, title: 'Frontend Application' };
          }

          let newTitle = step.title;
          let newPath = step.path;

          // Handle title prefixing
          if (newTitle && !newTitle.includes('frontend/')) {
            // Extract "Create X" pattern and prefix the file path
            const createMatch = newTitle.match(/^Create (.+)$/);
            if (createMatch) {
              newTitle = `Create frontend/${createMatch[1]}`;
            } else {
              newTitle = `frontend/${newTitle}`;
            }
          }

          // Handle path prefixing
          if (newPath && !newPath.startsWith('frontend/')) {
            newPath = `frontend/${newPath}`;
          }

          return { ...step, id: backendSteps.length + idx + 1, title: newTitle, path: newPath };
        });

        setSteps([...prefixedBackendSteps, ...prefixedFrontendSteps]);

        setLlmMessages([
          { role: "assistant", content: backendCode || '' },
          { role: "assistant", content: frontendCode || '' }
        ]);

      } else {
        // Normal flow for frontend/backend only projects
        const templatePrompt = originalRequirements?.trim() || prompt.trim();
        const projectTypeForTemplate = blueprint?.projectType || 'frontend';

        console.log('[Builder] Sending to /template:', templatePrompt.substring(0, 100) + '...');
        console.log('[Builder] Project type:', projectTypeForTemplate);

        const response = await axios.post(`${BACKEND_URL}/template`, {
          prompt: templatePrompt,
          projectType: projectTypeForTemplate
        });
        setTemplateSet(true);

        const { prompts, uiPrompts } = response.data;

        setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
          ...x,
          status: "pending"
        })));

        setLoading(true);

        let stepsResponse;

        if (useLangGraphMode) {
          // Use LangGraph-based generation with state management
          console.log('[Builder] 🚀 Using LANGGRAPH generation mode');
          stepsResponse = await axios.post(`${BACKEND_URL}/chat/langgraph`, {
            prompt: prompt,
            projectType: projectTypeForTemplate
          });
        } else {
          // OLD: Use single-call generation
          console.log('[Builder] Using standard generation mode');
          stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
            messages: [...prompts, prompt].map(content => ({
              role: "user",
              content
            }))
          });
        }

        setLoading(false);

        // Validate backend response
        if (!stepsResponse.data || !stepsResponse.data.response) {
          console.error('❌ Backend returned invalid response:', stepsResponse.data);
          throw new Error('Backend did not return a valid response. Please check backend logs.');
        }

        setSteps(s => {
          const newSteps = parseXml(stepsResponse.data.response);

          // Check if parseXml returned any steps
          if (newSteps.length === 0) {
            console.warn('⚠️ No steps were parsed from the response');
          }

          const maxId = s.length > 0 ? Math.max(...s.map(step => step.id)) : 0;
          return [...s, ...newSteps.map((x, idx) => ({
            ...x,
            id: maxId + idx + 1,
            status: "pending" as "pending"
          }))];
        });

        setLlmMessages([...prompts, prompt].map(content => ({
          role: "user",
          content
        })));

        setLlmMessages(x => [...x, { role: "assistant", content: stepsResponse.data.response }]);
      }
    } catch (error: any) {
      console.error('❌ Error generating website:', error);
      alert(`Failed to generate website: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col items-center space-y-6">
            <Sparkles className="w-16 h-16 text-yellow-400 animate-pulse" />
            <div className="relative">
              <div className="w-16 h-16 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-200">Crafting your website...</h2>
            <p className="text-gray-400">Please wait while we process your request</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col transition-colors duration-500">
      <header className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600/50 px-6 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                Site Crafter
              </h1>
            </button>
            <DownloadButton files={files} />
            {/* LangGraph Mode Toggle */}
            <button
              onClick={() => setUseLangGraphMode(!useLangGraphMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${useLangGraphMode
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              title={useLangGraphMode ? 'LangGraph Mode: Stateful generation with repair loops' : 'Standard Mode: Single LLM call'}
            >
              {useLangGraphMode ? '🔮 LangGraph' : '⚡ Standard'}
            </button>
            <span className="text-sm text-gray-400">Prompt: {prompt}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto transform transition-all duration-300 hover:scale-[1.01]">
            <div>
              <div className="max-h-[75vh] overflow-scroll rounded-xl bg-gray-800/50 backdrop-blur-sm shadow-xl border border-gray-700/50">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div className="mt-4">
                <div className='flex flex-col space-y-3'>
                  <br />
                  {(loading || !templateSet) && (
                    <div className="flex items-center justify-center p-4">
                      <Loader />
                    </div>
                  )}
                  {!(loading || !templateSet) && (
                    <div className='flex flex-col space-y-3'>
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className='p-4 w-full bg-gray-800/50 rounded-xl border border-gray-700/50 text-gray-300 placeholder-gray-500 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 focus:outline-none transition-all duration-300'
                        placeholder="Enter your next instruction..."
                      />
                      <button
                        onClick={async () => {
                          if (!userPrompt.trim()) return;

                          const newMessage = {
                            role: "user" as "user",
                            content: userPrompt
                          };

                          setLoading(true);
                          try {
                            const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                              messages: [...llmMessages, newMessage]
                            });

                            setLlmMessages(x => [...x, newMessage]);
                            setLlmMessages(x => [...x, {
                              role: "assistant",
                              content: stepsResponse.data.response
                            }]);

                            setSteps(s => {
                              const newSteps = parseXml(stepsResponse.data.response);
                              const maxId = s.length > 0 ? Math.max(...s.map(step => step.id)) : 0;
                              return [...s, ...newSteps.map((x, idx) => ({
                                ...x,
                                id: maxId + idx + 1,
                                status: "pending" as "pending"
                              }))];
                            });
                          } catch (error) {
                            console.error("Failed to generate response:", error);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className='bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-6 py-3 rounded-xl font-semibold hover:opacity-90 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                        disabled={loading || !userPrompt.trim()}
                      >
                        Send Instruction
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 transform transition-all duration-300 hover:scale-[1.01]">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 h-full">
              <FileExplorer
                files={files}
                onFileSelect={setSelectedFile}
              />
            </div>
          </div>

          <div className="col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-4 h-[calc(100vh-8rem)] transform transition-all duration-300 hover:scale-[1.01]">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'code'
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Code</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'preview'
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
            </div>
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor
                  file={selectedFile}
                  onCodeChange={handleCodeChange}
                />
              ) : (
                <PreviewFrame webContainer={webcontainer} files={files} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}