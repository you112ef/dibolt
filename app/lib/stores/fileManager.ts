import { atom } from 'nanostores';
import { AgentManager } from './agent';

export interface GitHubCloneResponse {
  files: any[];
}

export interface ZipImportResponse {
  files: any[];
}

export interface TemplateResponse {
  files: any[];
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  content?: string;
  language?: string;
  modified: number;
  created: number;
  children?: FileItem[];
  isExpanded?: boolean;
  isSelected?: boolean;
  aiAnalysis?: string;
}

export interface FileManagerState {
  files: FileItem[];
  currentFile: FileItem | null;
  selectedFiles: string[];
  searchQuery: string;
  sortBy: 'name' | 'modified' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  viewMode: 'tree' | 'list' | 'grid';
  isLoading: boolean;
  uploadProgress: { [key: string]: number };
}

const initialState: FileManagerState = {
  files: [],
  currentFile: null,
  selectedFiles: [],
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'tree',
  isLoading: false,
  uploadProgress: {}
};

export const fileManagerStore = atom<FileManagerState>(initialState);

export class FileManager {
  
  // File Operations
  static async createFile(path: string, content: string = ''): Promise<FileItem> {
    const fileItem: FileItem = {
      id: Date.now().toString(),
      name: path.split('/').pop() || 'untitled',
      type: 'file',
      path,
      content,
      language: this.detectLanguage(path),
      size: content.length,
      modified: Date.now(),
      created: Date.now()
    };

    // AI Analysis of the file content
    if (content.trim()) {
      try {
        fileItem.aiAnalysis = await AgentManager.analyzeCode(content, fileItem.language || 'text');
      } catch (error) {
        console.warn('AI analysis failed:', error);
      }
    }

    const state = fileManagerStore.get();
    fileManagerStore.set({
      ...state,
      files: [...state.files, fileItem]
    });

    return fileItem;
  }

  static async createFolder(path: string): Promise<FileItem> {
    const folderItem: FileItem = {
      id: Date.now().toString(),
      name: path.split('/').pop() || 'New Folder',
      type: 'folder',
      path,
      children: [],
      modified: Date.now(),
      created: Date.now(),
      isExpanded: false
    };

    const state = fileManagerStore.get();
    fileManagerStore.set({
      ...state,
      files: [...state.files, folderItem]
    });

    return folderItem;
  }

  static async updateFile(id: string, content: string): Promise<void> {
    const state = fileManagerStore.get();
    const updatedFiles = state.files.map(file => {
      if (file.id === id) {
        const updatedFile = {
          ...file,
          content,
          size: content.length,
          modified: Date.now()
        };

        // Trigger AI analysis in background
        this.analyzeFileInBackground(updatedFile);
        
        return updatedFile;
      }
      return file;
    });

    fileManagerStore.set({
      ...state,
      files: updatedFiles
    });
  }

  static async deleteFile(id: string): Promise<void> {
    const state = fileManagerStore.get();
    const updatedFiles = state.files.filter(file => file.id !== id);
    
    fileManagerStore.set({
      ...state,
      files: updatedFiles,
      currentFile: state.currentFile?.id === id ? null : state.currentFile
    });
  }

  static async renameFile(id: string, newName: string): Promise<void> {
    const state = fileManagerStore.get();
    const updatedFiles = state.files.map(file => {
      if (file.id === id) {
        const newPath = file.path.replace(file.name, newName);
        return {
          ...file,
          name: newName,
          path: newPath,
          language: file.type === 'file' ? this.detectLanguage(newPath) : undefined,
          modified: Date.now()
        };
      }
      return file;
    });

    fileManagerStore.set({
      ...state,
      files: updatedFiles
    });
  }

  // File Upload and Import
  static async uploadFiles(files: FileList): Promise<FileItem[]> {
    const state = fileManagerStore.get();
    fileManagerStore.set({ ...state, isLoading: true });

    const uploadedFiles: FileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Update progress
        const progress = { ...state.uploadProgress, [file.name]: 0 };
        fileManagerStore.set({ ...fileManagerStore.get(), uploadProgress: progress });

        const content = await this.readFileContent(file);
        
        // Update progress
        progress[file.name] = 50;
        fileManagerStore.set({ ...fileManagerStore.get(), uploadProgress: progress });

        // AI analysis before creating file
        let aiAnalysis = '';
        if (content.length < 10000) { // Only analyze smaller files
          try {
            const language = this.detectLanguage(file.name);
            aiAnalysis = await AgentManager.analyzeCode(content, language);
          } catch (error) {
            console.warn('AI analysis failed for', file.name, error);
          }
        }

        const fileItem: FileItem = {
          id: Date.now().toString() + i,
          name: file.name,
          type: 'file',
          path: file.name,
          content,
          language: this.detectLanguage(file.name),
          size: file.size,
          modified: file.lastModified,
          created: Date.now(),
          aiAnalysis
        };

        uploadedFiles.push(fileItem);

        // Complete progress
        progress[file.name] = 100;
        fileManagerStore.set({ ...fileManagerStore.get(), uploadProgress: progress });

      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
      }
    }

    const currentState = fileManagerStore.get();
    fileManagerStore.set({
      ...currentState,
      files: [...currentState.files, ...uploadedFiles],
      isLoading: false,
      uploadProgress: {}
    });

    return uploadedFiles;
  }

  static async cloneFromGitHub(repoUrl: string): Promise<FileItem[]> {
    const state = fileManagerStore.get();
    fileManagerStore.set({ ...state, isLoading: true });

    try {
      const response = await fetch('/api/github/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to clone repository');
      }

      const { files } = await response.json() as GitHubCloneResponse;
      const clonedFiles = await Promise.all(
        files.map(async (file: any) => {
          const fileItem: FileItem = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            type: file.type,
            path: file.path,
            content: file.content,
            language: this.detectLanguage(file.name),
            size: file.size,
            modified: Date.now(),
            created: Date.now()
          };

          // AI analysis for code files
          if (file.type === 'file' && file.content && file.content.length < 5000) {
            try {
              fileItem.aiAnalysis = await AgentManager.analyzeCode(file.content, fileItem.language || 'text');
            } catch (error) {
              console.warn('AI analysis failed for', file.name);
            }
          }

          return fileItem;
        })
      );

      const currentState = fileManagerStore.get();
      fileManagerStore.set({
        ...currentState,
        files: [...currentState.files, ...clonedFiles],
        isLoading: false
      });

      return clonedFiles;
    } catch (error) {
      console.error('GitHub clone failed:', error);
      fileManagerStore.set({ ...fileManagerStore.get(), isLoading: false });
      throw error;
    }
  }

  static async importZipFile(zipFile: File): Promise<FileItem[]> {
    const state = fileManagerStore.get();
    fileManagerStore.set({ ...state, isLoading: true });

    try {
      const formData = new FormData();
      formData.append('zipFile', zipFile);

      const response = await fetch('/api/import/zip', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to import ZIP file');
      }

      const { files } = await response.json() as ZipImportResponse;
      const importedFiles = files.map((file: any) => ({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: file.type,
        path: file.path,
        content: file.content,
        language: this.detectLanguage(file.name),
        size: file.size,
        modified: Date.now(),
        created: Date.now()
      }));

      const currentState = fileManagerStore.get();
      fileManagerStore.set({
        ...currentState,
        files: [...currentState.files, ...importedFiles],
        isLoading: false
      });

      return importedFiles;
    } catch (error) {
      console.error('ZIP import failed:', error);
      fileManagerStore.set({ ...fileManagerStore.get(), isLoading: false });
      throw error;
    }
  }

  // File Management
  static selectFile(id: string): void {
    const state = fileManagerStore.get();
    const file = state.files.find(f => f.id === id);
    
    if (file) {
      AgentManager.setCurrentFile(file.name);
      fileManagerStore.set({
        ...state,
        currentFile: file
      });
    }
  }

  static toggleFileSelection(id: string): void {
    const state = fileManagerStore.get();
    const isSelected = state.selectedFiles.includes(id);
    
    fileManagerStore.set({
      ...state,
      selectedFiles: isSelected 
        ? state.selectedFiles.filter(fileId => fileId !== id)
        : [...state.selectedFiles, id]
    });
  }

  static searchFiles(query: string): void {
    const state = fileManagerStore.get();
    fileManagerStore.set({
      ...state,
      searchQuery: query
    });
  }

  static sortFiles(sortBy: 'name' | 'modified' | 'size' | 'type', order?: 'asc' | 'desc'): void {
    const state = fileManagerStore.get();
    const sortOrder = order || (state.sortBy === sortBy && state.sortOrder === 'asc' ? 'desc' : 'asc');
    
    fileManagerStore.set({
      ...state,
      sortBy,
      sortOrder
    });
  }

  // AI Integration
  static async analyzeFileInBackground(file: FileItem): Promise<void> {
    if (!file.content || file.type !== 'file') return;

    try {
      const analysis = await AgentManager.analyzeCode(file.content, file.language || 'text');
      
      const state = fileManagerStore.get();
      const updatedFiles = state.files.map(f => 
        f.id === file.id ? { ...f, aiAnalysis: analysis } : f
      );
      
      fileManagerStore.set({
        ...state,
        files: updatedFiles
      });
    } catch (error) {
      console.warn('Background AI analysis failed:', error);
    }
  }

  static async getAISuggestions(fileId: string): Promise<string> {
    const state = fileManagerStore.get();
    const file = state.files.find(f => f.id === fileId);
    
    if (!file || !file.content) {
      throw new Error('File not found or has no content');
    }

    return await AgentManager.suggestImprovements(file.content);
  }

  // Utility Functions
  static detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash'
    };
    
    return languageMap[ext || ''] || 'text';
  }

  static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Export Functions
  static async exportAsZip(fileIds?: string[]): Promise<void> {
    const state = fileManagerStore.get();
    const filesToExport = fileIds 
      ? state.files.filter(f => fileIds.includes(f.id))
      : state.files;

    const response = await fetch('/api/export/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: filesToExport })
    });

    if (!response.ok) {
      throw new Error('Failed to export ZIP');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Project Templates
  static async createFromTemplate(templateName: string): Promise<FileItem[]> {
    const response = await fetch('/api/templates/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateName })
    });

    if (!response.ok) {
      throw new Error('Failed to create from template');
    }

    const { files } = await response.json() as TemplateResponse;
    const templateFiles = files.map((file: any) => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type,
      path: file.path,
      content: file.content,
      language: this.detectLanguage(file.name),
      size: file.content?.length || 0,
      modified: Date.now(),
      created: Date.now()
    }));

    const state = fileManagerStore.get();
    fileManagerStore.set({
      ...state,
      files: [...state.files, ...templateFiles]
    });

    return templateFiles;
  }
}