import { put, del, list } from '@vercel/blob';
import type { StorageAdapter, CreateProjectInput, AddSlideInput, ReorderSlidesInput } from './types';
import type { AppEnvironment, AppSettings, ProjectsIndex, ProjectSummary, ProjectMetadata, TemplateRecord, ProjectSlide } from '@/domain/models';
import { generateId } from '@/lib/utils';

/**
 * Vercel Blob Storage Adapter
 * Stores all data in Vercel Blob Storage instead of local filesystem
 * 
 * Structure:
 * - settings.json: App settings
 * - projects-index.json: List of all projects
 * - templates-index.json: List of all templates
 * - projects/{projectId}/project.json: Project metadata
 * - projects/{projectId}/slides/{fileName}.html: Slide HTML files
 * - templates/{categoryKey}/{templateSlug}.html: Template HTML files
 */
export class VercelBlobAdapter implements StorageAdapter {
  private blobToken: string;

  constructor() {
    this.blobToken = process.env.BLOB_READ_WRITE_TOKEN || '';
    if (!this.blobToken) {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
    }
  }

  private async getBlob(path: string): Promise<string | null> {
    try {
      const { blobs } = await list({ prefix: path, token: this.blobToken });
      if (blobs.length === 0) return null;
      
      // For private blobs, we need to use the downloadUrl with token
      const response = await fetch(blobs[0].downloadUrl, {
        headers: {
          'Authorization': `Bearer ${this.blobToken}`,
        },
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch blob ${path}: ${response.status} ${response.statusText}`);
        return null;
      }
      
      return await response.text();
    } catch (error) {
      console.error(`Error reading blob ${path}:`, error);
      return null;
    }
  }

  private async putBlob(path: string, content: string, addRandomSuffix: boolean = false): Promise<string> {
    const result = await put(path, content, {
      access: 'private',
      token: this.blobToken,
      addRandomSuffix,
    });
    return result.url;
  }

  private async deleteBlob(path: string): Promise<void> {
    try {
      const { blobs } = await list({ prefix: path, token: this.blobToken });
      for (const blob of blobs) {
        await del(blob.url, { token: this.blobToken });
      }
    } catch (error) {
      console.error(`Error deleting blob ${path}:`, error);
    }
  }

  async initEnvironment(): Promise<AppEnvironment> {
    // In Vercel, we don't have a local data root
    // Initialize with default settings if they don't exist
    const settings = await this.readSettings();
    if (!settings) {
      const defaultSettings: AppSettings = {
        schemaVersion: 1,
        dataRoot: 'vercel-blob',
        templatesRoot: 'templates',
        projectsRoot: 'projects',
        confirmBeforeDeleteSlide: true,
        confirmBeforeDeleteProject: true,
        autoRepairOnOpen: true,
        preview: {
          openInInternalViewer: true,
          sandbox: true,
        },
        categories: [],
      };
      await this.writeSettings(defaultSettings);
    }

    const index = await this.readProjectsIndex();
    if (!index) {
      await this.writeProjectsIndex({ schemaVersion: 1, projects: [] });
    }

    return {
      dataRoot: 'vercel-blob',
      templatesRoot: 'templates',
      projectsRoot: 'projects',
      configRoot: 'config',
      cacheRoot: 'cache',
      settingsPath: 'settings.json',
      projectsIndexPath: 'projects-index.json',
    };
  }

  async readSettings(): Promise<AppSettings | null> {
    const content = await this.getBlob('settings.json');
    return content ? JSON.parse(content) : null;
  }

  async writeSettings(settings: AppSettings): Promise<void> {
    // Delete existing settings first to avoid "blob already exists" error
    await this.deleteBlob('settings.json');
    await this.putBlob('settings.json', JSON.stringify(settings, null, 2));
  }

  async readProjectsIndex(): Promise<ProjectsIndex | null> {
    const content = await this.getBlob('projects-index.json');
    return content ? JSON.parse(content) : null;
  }

  async writeProjectsIndex(index: ProjectsIndex): Promise<void> {
    await this.putBlob('projects-index.json', JSON.stringify(index, null, 2));
  }

  async createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    const projectId = generateId('proj');
    const now = new Date().toISOString();

    const slug = input.name.toLowerCase().replace(/\s+/g, '-');
    const project: ProjectSummary = {
      id: projectId,
      name: input.name,
      slug,
      folderName: slug,
      slideCount: 0,
      createdAt: now,
      updatedAt: now,
      absolutePath: `projects/${projectId}`,
      status: 'active',
    };

    const metadata: ProjectMetadata = {
      schemaVersion: 1,
      project,
      slides: [],
    };

    // Delete existing project.json first to avoid "blob already exists" error
    await this.deleteBlob(`projects/${projectId}/project.json`);
    await this.putBlob(`projects/${projectId}/project.json`, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex() || { schemaVersion: 1, projects: [] };
    index.projects.push(project);
    await this.writeProjectsIndex(index);

    return project;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const index = await this.readProjectsIndex();
    return index?.projects || [];
  }

  async getProject(projectId: string): Promise<ProjectMetadata | null> {
    const content = await this.getBlob(`projects/${projectId}/project.json`);
    if (!content) return null;

    const metadata: ProjectMetadata = JSON.parse(content);

    // Auto-repair: sync with actual files in blob storage
    try {
      const { blobs } = await list({ 
        prefix: `projects/${projectId}/slides/`,
        token: this.blobToken 
      });
      
      const htmlFiles = blobs
        .filter(b => b.pathname.endsWith('.html') && !b.pathname.includes('.tmp'))
        .map(b => b.pathname.split('/').pop()!)
        .filter(Boolean);

      let needsRepair = false;
      const repairedSlides: ProjectSlide[] = [];

      // Check each slide in metadata
      for (const slide of metadata.slides) {
        const fileExists = htmlFiles.includes(slide.fileName);
        if (!fileExists) {
          const matchingFile = htmlFiles.find(f => f.includes(slide.instanceKey));
          if (matchingFile) {
            slide.fileName = matchingFile;
            slide.absolutePath = `projects/${projectId}/slides/${matchingFile}`;
            needsRepair = true;
          } else {
            needsRepair = true;
            continue;
          }
        }
        repairedSlides.push(slide);
      }

      // Auto-discover orphaned files
      for (const file of htmlFiles) {
        const existsInMetadata = repairedSlides.some(s => s.fileName === file);
        if (!existsInMetadata) {
          const match = file.match(/^(\d+)-(.+)-([a-z0-9]{4})\.html$/);
          if (match) {
            const [, orderStr, templateSlug, instanceKey] = match;
            const now = new Date().toISOString();
            const newSlide: ProjectSlide = {
              id: generateId('slide'),
              projectId: metadata.project.id,
              order: parseInt(orderStr, 10),
              title: templateSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              templateId: 'unknown',
              templateSlug,
              categoryKey: 'unknown',
              instanceKey,
              fileName: file,
              absolutePath: `projects/${projectId}/slides/${file}`,
              createdAt: now,
              updatedAt: now,
            };
            repairedSlides.push(newSlide);
            needsRepair = true;
          }
        }
      }

      if (needsRepair) {
        repairedSlides.sort((a, b) => a.fileName.localeCompare(b.fileName));
        repairedSlides.forEach((slide, index) => {
          slide.order = index + 1;
        });

        metadata.slides = repairedSlides;
        metadata.project.slideCount = repairedSlides.length;
        metadata.project.updatedAt = new Date().toISOString();

        await this.putBlob(`projects/${projectId}/project.json`, JSON.stringify(metadata, null, 2));

        const index = await this.readProjectsIndex();
        if (index) {
          const projectIndex = index.projects.find(p => p.id === projectId);
          if (projectIndex) {
            projectIndex.slideCount = metadata.project.slideCount;
            projectIndex.updatedAt = metadata.project.updatedAt;
            await this.writeProjectsIndex(index);
          }
        }
      }

      return metadata;
    } catch (error) {
      console.error('Error during auto-repair:', error);
      return metadata;
    }
  }

  async updateProjectName(projectId: string, newName: string): Promise<void> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    metadata.project.name = newName;
    metadata.project.updatedAt = new Date().toISOString();

    await this.putBlob(`projects/${projectId}/project.json`, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find(p => p.id === projectId);
      if (projectIndex) {
        projectIndex.name = newName;
        projectIndex.updatedAt = metadata.project.updatedAt;
        await this.writeProjectsIndex(index);
      }
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    const projects = await this.listProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    await this.deleteBlob(`projects/${projectId}/`);

    const index = await this.readProjectsIndex();
    if (index) {
      index.projects = index.projects.filter(p => p.id !== projectId);
      await this.writeProjectsIndex(index);
    }
  }

  async duplicateProject(projectId: string, newName: string): Promise<ProjectSummary> {
    const sourceMetadata = await this.getProject(projectId);
    if (!sourceMetadata) {
      throw new Error('Source project not found');
    }

    const newProject = await this.createProject({ name: newName });

    // Copy all slides
    for (const slide of sourceMetadata.slides) {
      const content = await this.getBlob(`projects/${projectId}/slides/${slide.fileName}`);
      if (content) {
        await this.putBlob(`projects/${newProject.id}/slides/${slide.fileName}`, content);
      }
    }

    // Update metadata
    const newMetadata = await this.getProject(newProject.id);
    if (newMetadata) {
      newMetadata.slides = sourceMetadata.slides.map(slide => ({
        ...slide,
        id: generateId('slide'),
        projectId: newProject.id,
        absolutePath: `projects/${newProject.id}/slides/${slide.fileName}`,
      }));
      newMetadata.project.slideCount = newMetadata.slides.length;
      await this.putBlob(`projects/${newProject.id}/project.json`, JSON.stringify(newMetadata, null, 2));
    }

    return newProject;
  }

  async reorderSlides(projectId: string, input: ReorderSlidesInput): Promise<void> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const reorderedSlides = input.slideIds.map(id => {
      const slide = metadata.slides.find(s => s.id === id);
      if (!slide) throw new Error(`Slide ${id} not found`);
      return slide;
    });

    // Rename files with new order
    const tempRenames: Array<{ oldPath: string; tempPath: string; newPath: string; slide: ProjectSlide }> = [];

    for (let i = 0; i < reorderedSlides.length; i++) {
      const slide = reorderedSlides[i];
      const newFileName = `${String(i + 1).padStart(3, '0')}-${slide.templateSlug}-${slide.instanceKey}.html`;
      const oldPath = `projects/${projectId}/slides/${slide.fileName}`;
      const tempPath = `projects/${projectId}/slides/temp-${i}-${slide.instanceKey}.html.tmp`;
      const newPath = `projects/${projectId}/slides/${newFileName}`;

      tempRenames.push({ oldPath, tempPath, newPath, slide });
    }

    // Two-pass rename
    for (const { oldPath, tempPath } of tempRenames) {
      const content = await this.getBlob(oldPath);
      if (content) {
        await this.putBlob(tempPath, content);
        await this.deleteBlob(oldPath);
      }
    }

    for (let i = 0; i < tempRenames.length; i++) {
      const { tempPath, newPath, slide } = tempRenames[i];
      const content = await this.getBlob(tempPath);
      if (content) {
        await this.putBlob(newPath, content);
        await this.deleteBlob(tempPath);
        
        const newFileName = newPath.split('/').pop()!;
        slide.fileName = newFileName;
        slide.absolutePath = newPath;
        slide.order = i + 1;
      }
    }

    metadata.slides = reorderedSlides;
    metadata.project.updatedAt = new Date().toISOString();
    await this.putBlob(`projects/${projectId}/project.json`, JSON.stringify(metadata, null, 2));
  }

  async scanTemplates(): Promise<TemplateRecord[]> {
    const content = await this.getBlob('templates-index.json');
    if (!content) {
      // Return empty array if no templates yet
      return [];
    }
    
    const index: { templates: TemplateRecord[] } = JSON.parse(content);
    return index.templates || [];
  }

  async addSlideToProject(projectId: string, input: AddSlideInput): Promise<ProjectSlide> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const templates = await this.scanTemplates();
    const template = templates.find(t => t.id === input.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const templateContent = await this.getBlob(`templates/${template.categoryKey}/${template.slug}.html`);
    if (!templateContent) {
      throw new Error('Template file not found');
    }

    const slideId = generateId('slide');
    const instanceKey = Math.random().toString(36).substring(2, 6);
    const order = metadata.slides.length + 1;
    const fileName = `${String(order).padStart(3, '0')}-${template.slug}-${instanceKey}.html`;
    const now = new Date().toISOString();

    const slide: ProjectSlide = {
      id: slideId,
      projectId,
      order,
      title: template.name,
      templateId: template.id,
      templateSlug: template.slug,
      categoryKey: template.categoryKey,
      instanceKey,
      fileName,
      absolutePath: `projects/${projectId}/slides/${fileName}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.putBlob(`projects/${projectId}/slides/${fileName}`, templateContent);

    metadata.slides.push(slide);
    metadata.project.slideCount = metadata.slides.length;
    metadata.project.updatedAt = now;

    await this.putBlob(`projects/${projectId}/project.json`, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find(p => p.id === projectId);
      if (projectIndex) {
        projectIndex.slideCount = metadata.project.slideCount;
        projectIndex.updatedAt = now;
        await this.writeProjectsIndex(index);
      }
    }

    return slide;
  }

  async deleteSlide(projectId: string, slideId: string): Promise<void> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const slide = metadata.slides.find(s => s.id === slideId);
    if (!slide) {
      throw new Error('Slide not found');
    }

    await this.deleteBlob(`projects/${projectId}/slides/${slide.fileName}`);

    metadata.slides = metadata.slides.filter(s => s.id !== slideId);
    
    // Reorder remaining slides
    metadata.slides.sort((a, b) => a.order - b.order);
    for (let i = 0; i < metadata.slides.length; i++) {
      const s = metadata.slides[i];
      const newOrder = i + 1;
      if (s.order !== newOrder) {
        const oldFileName = s.fileName;
        const newFileName = `${String(newOrder).padStart(3, '0')}-${s.templateSlug}-${s.instanceKey}.html`;
        
        const content = await this.getBlob(`projects/${projectId}/slides/${oldFileName}`);
        if (content) {
          await this.putBlob(`projects/${projectId}/slides/${newFileName}`, content);
          await this.deleteBlob(`projects/${projectId}/slides/${oldFileName}`);
        }
        
        s.order = newOrder;
        s.fileName = newFileName;
        s.absolutePath = `projects/${projectId}/slides/${newFileName}`;
      }
    }

    metadata.project.slideCount = metadata.slides.length;
    metadata.project.updatedAt = new Date().toISOString();

    await this.putBlob(`projects/${projectId}/project.json`, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find(p => p.id === projectId);
      if (projectIndex) {
        projectIndex.slideCount = metadata.project.slideCount;
        projectIndex.updatedAt = metadata.project.updatedAt;
        await this.writeProjectsIndex(index);
      }
    }
  }

  async duplicateSlide(projectId: string, slideId: string): Promise<ProjectSlide> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const sourceSlide = metadata.slides.find(s => s.id === slideId);
    if (!sourceSlide) {
      throw new Error('Slide not found');
    }

    const content = await this.getBlob(`projects/${projectId}/slides/${sourceSlide.fileName}`);
    if (!content) {
      throw new Error('Slide file not found');
    }

    const newSlideId = generateId('slide');
    const instanceKey = Math.random().toString(36).substring(2, 6);
    const order = metadata.slides.length + 1;
    const fileName = `${String(order).padStart(3, '0')}-${sourceSlide.templateSlug}-${instanceKey}.html`;
    const now = new Date().toISOString();

    const newSlide: ProjectSlide = {
      id: newSlideId,
      projectId,
      order,
      title: `${sourceSlide.title} (copy)`,
      templateId: sourceSlide.templateId,
      templateSlug: sourceSlide.templateSlug,
      categoryKey: sourceSlide.categoryKey,
      instanceKey,
      fileName,
      absolutePath: `projects/${projectId}/slides/${fileName}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.putBlob(`projects/${projectId}/slides/${fileName}`, content);

    metadata.slides.push(newSlide);
    metadata.project.slideCount = metadata.slides.length;
    metadata.project.updatedAt = now;

    await this.putBlob(`projects/${projectId}/project.json`, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find(p => p.id === projectId);
      if (projectIndex) {
        projectIndex.slideCount = metadata.project.slideCount;
        projectIndex.updatedAt = now;
        await this.writeProjectsIndex(index);
      }
    }

    return newSlide;
  }

  async getSlideContent(projectId: string, slideId: string): Promise<string> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const slide = metadata.slides.find(s => s.id === slideId);
    if (!slide) {
      throw new Error('Slide not found');
    }

    const content = await this.getBlob(`projects/${projectId}/slides/${slide.fileName}`);
    if (!content) {
      throw new Error('Slide file not found');
    }

    return content;
  }

  async fileExists(path: string): Promise<boolean> {
    const content = await this.getBlob(path);
    return content !== null;
  }

  async readFile(path: string): Promise<string> {
    const content = await this.getBlob(path);
    if (!content) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.putBlob(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    await this.deleteBlob(path);
  }

  async createDirectory(_path: string): Promise<void> {
    // No-op in blob storage - directories are implicit
  }

  async listDirectory(path: string): Promise<string[]> {
    const { blobs } = await list({ prefix: path, token: this.blobToken });
    return blobs.map(b => b.pathname);
  }

  async copyFile(source: string, destination: string): Promise<void> {
    const content = await this.getBlob(source);
    if (content) {
      await this.putBlob(destination, content);
    }
  }

  async deleteDirectory(path: string): Promise<void> {
    await this.deleteBlob(path);
  }

  async copyDirectory(source: string, destination: string): Promise<void> {
    const { blobs } = await list({ prefix: source, token: this.blobToken });
    for (const blob of blobs) {
      const relativePath = blob.pathname.substring(source.length);
      const response = await fetch(blob.downloadUrl, {
        headers: {
          'Authorization': `Bearer ${this.blobToken}`,
        },
      });
      const content = await response.text();
      await this.putBlob(`${destination}${relativePath}`, content);
    }
  }
}
