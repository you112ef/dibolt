import { atom } from 'nanostores';
import type { FileItem } from './fileManager';

export interface DeploymentConfig {
  platform: 'vercel' | 'netlify' | 'cloudflare' | 'github-pages';
  projectName: string;
  buildCommand?: string;
  outputDirectory?: string;
  environmentVariables?: { [key: string]: string };
  domain?: string;
  redirects?: Array<{
    source: string;
    destination: string;
    permanent: boolean;
  }>;
}

export interface DeploymentStatus {
  id: string;
  platform: string;
  status: 'pending' | 'building' | 'success' | 'failed' | 'cancelled';
  url?: string;
  deployUrl?: string;
  previewUrl?: string;
  buildLogs: string[];
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface DeploymentState {
  deployments: DeploymentStatus[];
  activeDeployment: DeploymentStatus | null;
  isDeploying: boolean;
  platforms: {
    vercel: { connected: boolean; token?: string; team?: string };
    netlify: { connected: boolean; token?: string; siteId?: string };
    cloudflare: { connected: boolean; token?: string; accountId?: string };
    githubPages: { connected: boolean; token?: string; repo?: string };
  };
}

const initialState: DeploymentState = {
  deployments: [],
  activeDeployment: null,
  isDeploying: false,
  platforms: {
    vercel: { connected: false },
    netlify: { connected: false },
    cloudflare: { connected: false },
    githubPages: { connected: false }
  }
};

export const deploymentStore = atom<DeploymentState>(initialState);

export class DeploymentManager {
  
  // Platform Connection
  static async connectVercel(token: string, team?: string): Promise<void> {
    try {
      const response = await fetch('/api/deployment/vercel/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, team })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Vercel');
      }

      const state = deploymentStore.get();
      deploymentStore.set({
        ...state,
        platforms: {
          ...state.platforms,
          vercel: { connected: true, token, team }
        }
      });
    } catch (error) {
      console.error('Vercel connection failed:', error);
      throw error;
    }
  }

  static async connectNetlify(token: string, siteId?: string): Promise<void> {
    try {
      const response = await fetch('/api/deployment/netlify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, siteId })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Netlify');
      }

      const state = deploymentStore.get();
      deploymentStore.set({
        ...state,
        platforms: {
          ...state.platforms,
          netlify: { connected: true, token, siteId }
        }
      });
    } catch (error) {
      console.error('Netlify connection failed:', error);
      throw error;
    }
  }

  static async connectCloudflare(token: string, accountId?: string): Promise<void> {
    try {
      const response = await fetch('/api/deployment/cloudflare/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, accountId })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Cloudflare');
      }

      const state = deploymentStore.get();
      deploymentStore.set({
        ...state,
        platforms: {
          ...state.platforms,
          cloudflare: { connected: true, token, accountId }
        }
      });
    } catch (error) {
      console.error('Cloudflare connection failed:', error);
      throw error;
    }
  }

  // Deployment Functions
  static async deployToVercel(files: FileItem[], config: DeploymentConfig): Promise<DeploymentStatus> {
    const state = deploymentStore.get();
    
    if (!state.platforms.vercel.connected) {
      throw new Error('Vercel not connected');
    }

    const deployment: DeploymentStatus = {
      id: Date.now().toString(),
      platform: 'vercel',
      status: 'pending',
      buildLogs: [],
      createdAt: Date.now()
    };

    // Add to deployments
    deploymentStore.set({
      ...state,
      deployments: [...state.deployments, deployment],
      activeDeployment: deployment,
      isDeploying: true
    });

    try {
      const response = await fetch('/api/deployment/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            type: f.type
          })),
          config
        })
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      const result = await response.json() as { deploymentUrl: string; previewUrl: string };
      
      const updatedDeployment: DeploymentStatus = {
        ...deployment,
        status: 'success',
        url: result.deploymentUrl,
        previewUrl: result.previewUrl,
        completedAt: Date.now(),
        buildLogs: [...deployment.buildLogs, 'Deployment successful']
      };

      this.updateDeployment(updatedDeployment);
      return updatedDeployment;

    } catch (error) {
      const failedDeployment: DeploymentStatus = {
        ...deployment,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
        buildLogs: [...deployment.buildLogs, `Error: ${error}`]
      };

      this.updateDeployment(failedDeployment);
      throw error;
    }
  }

  static async deployToNetlify(files: FileItem[], config: DeploymentConfig): Promise<DeploymentStatus> {
    const state = deploymentStore.get();
    
    if (!state.platforms.netlify.connected) {
      throw new Error('Netlify not connected');
    }

    const deployment: DeploymentStatus = {
      id: Date.now().toString(),
      platform: 'netlify',
      status: 'pending',
      buildLogs: ['Starting Netlify deployment...'],
      createdAt: Date.now()
    };

    deploymentStore.set({
      ...state,
      deployments: [...state.deployments, deployment],
      activeDeployment: deployment,
      isDeploying: true
    });

    try {
      const response = await fetch('/api/deployment/netlify/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            type: f.type
          })),
          config
        })
      });

      if (!response.ok) {
        throw new Error('Netlify deployment failed');
      }

      const result = await response.json() as { deploymentUrl: string; siteUrl: string };
      
      const updatedDeployment: DeploymentStatus = {
        ...deployment,
        status: 'success',
        url: result.siteUrl,
        deployUrl: result.deploymentUrl,
        completedAt: Date.now(),
        buildLogs: [...deployment.buildLogs, 'Deployment successful to Netlify']
      };

      this.updateDeployment(updatedDeployment);
      return updatedDeployment;

    } catch (error) {
      const failedDeployment: DeploymentStatus = {
        ...deployment,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
        buildLogs: [...deployment.buildLogs, `Netlify Error: ${error}`]
      };

      this.updateDeployment(failedDeployment);
      throw error;
    }
  }

  static async deployToCloudflare(files: FileItem[], config: DeploymentConfig): Promise<DeploymentStatus> {
    const state = deploymentStore.get();
    
    if (!state.platforms.cloudflare.connected) {
      throw new Error('Cloudflare not connected');
    }

    const deployment: DeploymentStatus = {
      id: Date.now().toString(),
      platform: 'cloudflare',
      status: 'pending',
      buildLogs: ['Starting Cloudflare Pages deployment...'],
      createdAt: Date.now()
    };

    deploymentStore.set({
      ...state,
      deployments: [...state.deployments, deployment],
      activeDeployment: deployment,
      isDeploying: true
    });

    try {
      const response = await fetch('/api/deployment/cloudflare/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            type: f.type
          })),
          config
        })
      });

      if (!response.ok) {
        throw new Error('Cloudflare deployment failed');
      }

      const result = await response.json() as { deploymentUrl: string; previewUrl: string };
      
      const updatedDeployment: DeploymentStatus = {
        ...deployment,
        status: 'success',
        url: result.deploymentUrl,
        previewUrl: result.previewUrl,
        completedAt: Date.now(),
        buildLogs: [...deployment.buildLogs, 'Deployment successful to Cloudflare Pages']
      };

      this.updateDeployment(updatedDeployment);
      return updatedDeployment;

    } catch (error) {
      const failedDeployment: DeploymentStatus = {
        ...deployment,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
        buildLogs: [...deployment.buildLogs, `Cloudflare Error: ${error}`]
      };

      this.updateDeployment(failedDeployment);
      throw error;
    }
  }

  // Export Functions
  static async exportAsZip(files: FileItem[], config?: DeploymentConfig): Promise<void> {
    try {
      const response = await fetch('/api/export/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            type: f.type
          })),
          config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export ZIP');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config?.projectName || 'project'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('ZIP export failed:', error);
      throw error;
    }
  }

  static async exportAsPWA(files: FileItem[], config: DeploymentConfig): Promise<void> {
    try {
      const response = await fetch('/api/export/pwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            type: f.type
          })),
          config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export PWA');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.projectName}-pwa.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PWA export failed:', error);
      throw error;
    }
  }

  static async exportAsAPK(files: FileItem[], config: DeploymentConfig): Promise<void> {
    try {
      const response = await fetch('/api/export/apk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            type: f.type
          })),
          config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export APK');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.projectName}.apk`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('APK export failed:', error);
      throw error;
    }
  }

  // Deployment Management
  static updateDeployment(deployment: DeploymentStatus): void {
    const state = deploymentStore.get();
    const updatedDeployments = state.deployments.map(d => 
      d.id === deployment.id ? deployment : d
    );

    deploymentStore.set({
      ...state,
      deployments: updatedDeployments,
      activeDeployment: deployment,
      isDeploying: deployment.status === 'pending' || deployment.status === 'building'
    });
  }

  static getDeploymentById(id: string): DeploymentStatus | undefined {
    const state = deploymentStore.get();
    return state.deployments.find(d => d.id === id);
  }

  static getDeploymentsByPlatform(platform: string): DeploymentStatus[] {
    const state = deploymentStore.get();
    return state.deployments.filter(d => d.platform === platform);
  }

  static async cancelDeployment(id: string): Promise<void> {
    const deployment = this.getDeploymentById(id);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    if (deployment.status !== 'pending' && deployment.status !== 'building') {
      throw new Error('Cannot cancel completed deployment');
    }

    try {
      await fetch(`/api/deployment/${deployment.platform}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId: id })
      });

      const cancelledDeployment: DeploymentStatus = {
        ...deployment,
        status: 'cancelled',
        completedAt: Date.now(),
        buildLogs: [...deployment.buildLogs, 'Deployment cancelled by user']
      };

      this.updateDeployment(cancelledDeployment);
    } catch (error) {
      console.error('Failed to cancel deployment:', error);
      throw error;
    }
  }

  // Platform Status
  static async checkPlatformStatus(): Promise<void> {
    const state = deploymentStore.get();
    
    // Check each connected platform
    const platforms = Object.keys(state.platforms) as Array<keyof typeof state.platforms>;
    
    for (const platform of platforms) {
      if (state.platforms[platform].connected) {
        try {
          const response = await fetch(`/api/deployment/${platform}/status`);
          if (!response.ok) {
            // Mark platform as disconnected if status check fails
            deploymentStore.set({
              ...deploymentStore.get(),
              platforms: {
                ...deploymentStore.get().platforms,
                [platform]: { ...state.platforms[platform], connected: false }
              }
            });
          }
        } catch (error) {
          console.warn(`Platform ${platform} status check failed:`, error);
        }
      }
    }
  }

  // Environment Variables Management
  static async setEnvironmentVariables(platform: string, variables: { [key: string]: string }): Promise<void> {
    try {
      await fetch(`/api/deployment/${platform}/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables })
      });
    } catch (error) {
      console.error('Failed to set environment variables:', error);
      throw error;
    }
  }

  // Build Configuration
  static getDefaultBuildConfig(projectType: string): Partial<DeploymentConfig> {
    const configs: { [key: string]: Partial<DeploymentConfig> } = {
      'react': {
        buildCommand: 'npm run build',
        outputDirectory: 'build'
      },
      'next': {
        buildCommand: 'npm run build',
        outputDirectory: '.next'
      },
      'vue': {
        buildCommand: 'npm run build',
        outputDirectory: 'dist'
      },
      'angular': {
        buildCommand: 'npm run build',
        outputDirectory: 'dist'
      },
      'svelte': {
        buildCommand: 'npm run build',
        outputDirectory: 'public'
      },
      'static': {
        buildCommand: '',
        outputDirectory: '.'
      }
    };

    return configs[projectType] || configs['static'];
  }
}