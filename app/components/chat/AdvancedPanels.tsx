/*
 * @ts-nocheck
 * Advanced Panels Component for SH AI Assistant
 */
import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { agentStore, AgentManager } from '~/lib/stores/agent';
import { fileManagerStore, FileManager } from '~/lib/stores/fileManager';
import { deploymentStore, DeploymentManager } from '~/lib/stores/deployment';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';

interface AdvancedPanelsProps {
  agentMemory: boolean;
  fileManager: boolean;
  deployment: boolean;
  className?: string;
}

export function AdvancedPanels({ agentMemory, fileManager, deployment, className }: AdvancedPanelsProps) {
  const [activePanel, setActivePanel] = useState<'agent' | 'files' | 'deploy' | null>(null);
  
  // Store states
  const agentState = useStore(agentStore);
  const fileManagerState = useStore(fileManagerStore);
  const deploymentState = useStore(deploymentStore);

  if (!agentMemory && !fileManager && !deployment) {
    return null;
  }

  return (
    <div className={classNames('bg-bolt-elements-background-depth-2 border-l border-bolt-elements-borderColor', className)}>
      {/* Panel Tabs */}
      <div className="flex border-b border-bolt-elements-borderColor">
        {agentMemory && (
          <button
            onClick={() => setActivePanel(activePanel === 'agent' ? null : 'agent')}
            className={classNames(
              'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
              activePanel === 'agent'
                ? 'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border-b-2 border-purple-500'
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1'
            )}
          >
            <div className="i-ph:brain text-purple-500" />
            Memory ({agentState.memory.length})
          </button>
        )}
        
        {fileManager && (
          <button
            onClick={() => setActivePanel(activePanel === 'files' ? null : 'files')}
            className={classNames(
              'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
              activePanel === 'files'
                ? 'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border-b-2 border-purple-500'
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1'
            )}
          >
            <div className="i-ph:folder text-purple-500" />
            Files ({fileManagerState.files.length})
          </button>
        )}
        
        {deployment && (
          <button
            onClick={() => setActivePanel(activePanel === 'deploy' ? null : 'deploy')}
            className={classNames(
              'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
              activePanel === 'deploy'
                ? 'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border-b-2 border-purple-500'
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1'
            )}
          >
            <div className="i-ph:rocket text-purple-500" />
            Deploy ({deploymentState.deployments.length})
          </button>
        )}
      </div>

      {/* Panel Content */}
      <div className="h-80 overflow-y-auto">
        {activePanel === 'agent' && <AgentMemoryPanel />}
        {activePanel === 'files' && <FileManagerPanel />}
        {activePanel === 'deploy' && <DeploymentPanel />}
      </div>
    </div>
  );
}

// Agent Memory Panel
function AgentMemoryPanel() {
  const agentState = useStore(agentStore);
  
  const clearMemory = () => {
    AgentManager.clearMemory();
  };

  const exportMemory = () => {
    const memory = AgentManager.exportMemory();
    const blob = new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-memory.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-bolt-elements-textSecondary">
          Provider: {agentState.provider || 'None'}
        </div>
        <div className="flex gap-2">
          <IconButton
            title="Export Memory"
            onClick={exportMemory}
            className="text-xs"
          >
            <div className="i-ph:download text-sm" />
          </IconButton>
          <IconButton
            title="Clear Memory"
            onClick={clearMemory}
            className="text-xs text-red-500"
          >
            <div className="i-ph:trash text-sm" />
          </IconButton>
        </div>
      </div>

      {/* Current Context */}
      {agentState.context && (
        <div className="bg-bolt-elements-background-depth-1 p-3 rounded border">
          <div className="text-xs text-bolt-elements-textSecondary mb-1">Current Context:</div>
          <div className="text-xs text-bolt-elements-textPrimary whitespace-pre-wrap">
            {agentState.context}
          </div>
        </div>
      )}

      {/* Memory Entries */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-bolt-elements-textPrimary">Recent Interactions</div>
        {agentState.memory.length === 0 ? (
          <div className="text-xs text-bolt-elements-textSecondary">No memory entries yet</div>
        ) : (
          agentState.memory.slice(-5).reverse().map((memory) => (
            <div key={memory.id} className="bg-bolt-elements-background-depth-1 p-3 rounded border space-y-2">
              <div className="text-xs text-bolt-elements-textSecondary">
                {new Date(memory.timestamp).toLocaleString()}
              </div>
              <div className="text-xs text-bolt-elements-textPrimary">
                <strong>Q:</strong> {memory.prompt.substring(0, 100)}...
              </div>
              <div className="text-xs text-bolt-elements-textSecondary">
                <strong>A:</strong> {memory.response.substring(0, 150)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// File Manager Panel
function FileManagerPanel() {
  const fileManagerState = useStore(fileManagerStore);
  
  return (
    <div className="p-4 space-y-4">
      {/* File Actions */}
      <div className="flex gap-2">
        <IconButton
          title="Create File"
          onClick={async () => {
            const fileName = prompt('Enter file name:');
            if (fileName) {
              await FileManager.createFile(fileName, '');
            }
          }}
          className="text-xs"
        >
          <div className="i-ph:file-plus text-sm" />
        </IconButton>
        <IconButton
          title="Import ZIP"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                try {
                  await FileManager.importZipFile(file);
                } catch (error) {
                  console.error('ZIP import failed:', error);
                }
              }
            };
            input.click();
          }}
          className="text-xs"
        >
          <div className="i-ph:file-zip text-sm" />
        </IconButton>
        <IconButton
          title="Export ZIP"
          onClick={async () => {
            try {
              await FileManager.exportAsZip();
            } catch (error) {
              console.error('ZIP export failed:', error);
            }
          }}
          className="text-xs"
        >
          <div className="i-ph:download text-sm" />
        </IconButton>
      </div>

      {/* File List */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-bolt-elements-textPrimary">Project Files</div>
        {fileManagerState.files.length === 0 ? (
          <div className="text-xs text-bolt-elements-textSecondary">No files in project</div>
        ) : (
          fileManagerState.files.map((file) => (
            <div key={file.id} className="bg-bolt-elements-background-depth-1 p-2 rounded border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={classNames(
                  'text-sm',
                  file.language === 'typescript' ? 'i-ph:file-ts text-blue-500' :
                  file.language === 'javascript' ? 'i-ph:file-js text-yellow-500' :
                  file.language === 'html' ? 'i-ph:file-html text-orange-500' :
                  file.language === 'css' ? 'i-ph:file-css text-blue-400' :
                  'i-ph:file text-gray-500'
                )} />
                <span className="text-xs text-bolt-elements-textPrimary">{file.name}</span>
                <span className="text-xs text-bolt-elements-textSecondary">({file.size} bytes)</span>
              </div>
              <div className="flex gap-1">
                <IconButton
                  title="Edit"
                  onClick={() => FileManager.selectFile(file.id)}
                  className="text-xs"
                >
                  <div className="i-ph:pencil text-xs" />
                </IconButton>
                <IconButton
                  title="Delete"
                  onClick={async () => {
                    if (confirm(`Delete ${file.name}?`)) {
                      await FileManager.deleteFile(file.id);
                    }
                  }}
                  className="text-xs text-red-500"
                >
                  <div className="i-ph:trash text-xs" />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Deployment Panel
function DeploymentPanel() {
  const deploymentState = useStore(deploymentStore);
  const fileManagerState = useStore(fileManagerStore);
  
  return (
    <div className="p-4 space-y-4">
      {/* Deployment Actions */}
      <div className="flex gap-2">
        <IconButton
          title="Deploy to Vercel"
          onClick={async () => {
            try {
              const config = {
                platform: 'vercel' as const,
                projectName: 'SH-Project',
                buildCommand: 'npm run build',
                outputDirectory: 'dist'
              };
              await DeploymentManager.deployToVercel(fileManagerState.files, config);
            } catch (error) {
              console.error('Vercel deployment failed:', error);
            }
          }}
          className="text-xs"
        >
          <div className="i-ph:triangle text-sm" />
        </IconButton>
        <IconButton
          title="Deploy to Netlify"
          onClick={async () => {
            try {
              const config = {
                platform: 'netlify' as const,
                projectName: 'SH-Project',
                buildCommand: 'npm run build',
                outputDirectory: 'dist'
              };
              await DeploymentManager.deployToNetlify(fileManagerState.files, config);
            } catch (error) {
              console.error('Netlify deployment failed:', error);
            }
          }}
          className="text-xs"
        >
          <div className="i-ph:globe text-sm" />
        </IconButton>
        <IconButton
          title="Deploy to Cloudflare"
          onClick={async () => {
            try {
              const config = {
                platform: 'cloudflare' as const,
                projectName: 'SH-Project',
                buildCommand: 'npm run build',
                outputDirectory: 'dist'
              };
              await DeploymentManager.deployToCloudflare(fileManagerState.files, config);
            } catch (error) {
              console.error('Cloudflare deployment failed:', error);
            }
          }}
          className="text-xs"
        >
          <div className="i-ph:cloud text-sm" />
        </IconButton>
      </div>

      {/* Deployment Status */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-bolt-elements-textPrimary">Deployments</div>
        {deploymentState.deployments.length === 0 ? (
          <div className="text-xs text-bolt-elements-textSecondary">No deployments yet</div>
        ) : (
          deploymentState.deployments.map((deployment) => (
            <div key={deployment.id} className="bg-bolt-elements-background-depth-1 p-3 rounded border space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-bolt-elements-textPrimary">{deployment.platform}</div>
                <div className={classNames(
                  'text-xs px-2 py-1 rounded',
                  deployment.status === 'success' ? 'bg-green-500/20 text-green-400' :
                  deployment.status === 'building' ? 'bg-yellow-500/20 text-yellow-400' :
                  deployment.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                  deployment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                )}>
                  {deployment.status}
                </div>
              </div>
              <div className="text-xs text-bolt-elements-textSecondary">
                {new Date(deployment.createdAt).toLocaleString()}
              </div>
              {deployment.url && (
                <div className="text-xs">
                  <a 
                    href={deployment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View Deployment →
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}