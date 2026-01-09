import React from 'react';
import { Download } from 'lucide-react';
import JSZip from 'jszip';
import { FileItem } from '../hooks/types';

interface DownloadButtonProps {
  files: FileItem[];
}

export function DownloadButton({ files }: DownloadButtonProps) {
  const handleDownload = async () => {
    const zip = new JSZip();

    const addFilesToZip = (items: FileItem[], currentPath: string = '') => {
      items.forEach((item) => {
        const itemPath = `${currentPath}${item.name}`;
        
        if (item.type === 'file') {
          zip.file(itemPath, item.content || '');
        } else if (item.type === 'folder' && item.children) {
          addFilesToZip(item.children, `${itemPath}/`);
        }
      });
    };

    addFilesToZip(files);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-generated-code.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
    >
      <Download className="w-4 h-4" />
      <span>Download Code</span>
    </button>
  );
}