export interface DocumentationItem {
  id: string;
  title: string;
  description: string;
  category: 'project' | 'input-modules' | 'output-modules' | 'development';
  type: 'markdown' | 'wiki';
  path: string;
  icon: string;
  color: string;
}

export interface DocumentationSection {
  title: string;
  description: string;
  items: DocumentationItem[];
}

export class DocumentationService {
  private static instance: DocumentationService;
  
  public static getInstance(): DocumentationService {
    if (!DocumentationService.instance) {
      DocumentationService.instance = new DocumentationService();
    }
    return DocumentationService.instance;
  }

  public async getDocumentationSections(): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [
      {
        title: 'Project Documentation',
        description: 'Core project documentation and guides',
        items: [
          {
            id: 'frontend-design',
            title: 'Frontend Design',
            description: 'Design system and UI/UX guidelines for the frontend',
            category: 'project',
            type: 'markdown',
            path: '/documentation/FrontendDesign.md',
            icon: '🎨',
            color: 'border-blue-500 bg-blue-50'
          },
          {
            id: 'developer-onboarding',
            title: 'Developer Onboarding',
            description: 'Getting started guide for new developers',
            category: 'project',
            type: 'markdown',
            path: '/documentation/DeveloperOnboarding.md',
            icon: '🚀',
            color: 'border-green-500 bg-green-50'
          },
          {
            id: 'types-guide',
            title: 'Types Guide',
            description: 'Comprehensive guide to TypeScript types used in the project',
            category: 'project',
            type: 'markdown',
            path: '/documentation/TypesGuide.md',
            icon: '📝',
            color: 'border-purple-500 bg-purple-50'
          },
          {
            id: 'module-development',
            title: 'Module Development Guide',
            description: 'How to create and develop new modules',
            category: 'project',
            type: 'markdown',
            path: '/documentation/ModuleDevelopmentGuide.md',
            icon: '🔧',
            color: 'border-orange-500 bg-orange-50'
          }
        ]
      },
      {
        title: 'Input Modules',
        description: 'Documentation for input modules',
        items: [
          {
            id: 'frames-input',
            title: 'Frames Input',
            description: 'Monitors sACN frame numbers on Universe 999',
            category: 'input-modules',
            type: 'wiki',
            path: '/modules/input/frames_input/wiki.md',
            icon: '🎬',
            color: 'border-red-500 bg-red-50'
          },
          {
            id: 'http-input',
            title: 'HTTP Input',
            description: 'Receives data via HTTP requests',
            category: 'input-modules',
            type: 'wiki',
            path: '/modules/input/http_input/wiki.md',
            icon: '🌐',
            color: 'border-blue-500 bg-blue-50'
          },
          {
            id: 'osc-input',
            title: 'OSC Input',
            description: 'Receives Open Sound Control messages',
            category: 'input-modules',
            type: 'wiki',
            path: '/modules/input/osc_input/wiki.md',
            icon: '🎵',
            color: 'border-green-500 bg-green-50'
          },
          {
            id: 'serial-input',
            title: 'Serial Input',
            description: 'Receives data from serial ports',
            category: 'input-modules',
            type: 'wiki',
            path: '/modules/input/serial_input/wiki.md',
            icon: '🔌',
            color: 'border-yellow-500 bg-yellow-50'
          },
          {
            id: 'time-input',
            title: 'Time Input',
            description: 'Generates time-based triggers',
            category: 'input-modules',
            type: 'wiki',
            path: '/modules/input/time_input/wiki.md',
            icon: '⏰',
            color: 'border-purple-500 bg-purple-50'
          }
        ]
      },
      {
        title: 'Output Modules',
        description: 'Documentation for output modules',
        items: [
          {
            id: 'audio-output',
            title: 'Audio Output',
            description: 'Plays audio files and streams',
            category: 'output-modules',
            type: 'wiki',
            path: '/modules/output/audio_output/wiki.md',
            icon: '🔊',
            color: 'border-pink-500 bg-pink-50'
          },
          {
            id: 'dmx-output',
            title: 'DMX Output',
            description: 'Controls DMX lighting fixtures',
            category: 'output-modules',
            type: 'wiki',
            path: '/modules/output/dmx_output/wiki.md',
            icon: '💡',
            color: 'border-indigo-500 bg-indigo-50'
          },
          {
            id: 'http-output',
            title: 'HTTP Output',
            description: 'Sends data via HTTP requests',
            category: 'output-modules',
            type: 'wiki',
            path: '/modules/output/http_output/wiki.md',
            icon: '📡',
            color: 'border-teal-500 bg-teal-50'
          },
          {
            id: 'osc-output',
            title: 'OSC Output',
            description: 'Sends Open Sound Control messages',
            category: 'output-modules',
            type: 'wiki',
            path: '/modules/output/osc_output/wiki.md',
            icon: '🎶',
            color: 'border-emerald-500 bg-emerald-50'
          }
        ]
      }
    ];

    return sections;
  }

  public async getDocumentationContent(path: string): Promise<string> {
    try {
      const response = await fetch(`/api/documentation${path}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error fetching documentation:', error);
      return `# Documentation Not Found

The requested documentation could not be loaded.

**Path:** ${path}

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

Please check that the documentation file exists and is accessible.`;
    }
  }
}

export const documentationService = DocumentationService.getInstance(); 