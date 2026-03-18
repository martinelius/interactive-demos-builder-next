import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { homedir } from 'os';
import type { StorageAdapter, CreateProjectInput, AddSlideInput, ReorderSlidesInput } from './types';
import type { AppEnvironment, AppSettings, ProjectsIndex, ProjectSummary, ProjectMetadata, TemplateRecord, ProjectSlide } from '@/domain/models';
import { createDefaultSettings, createEmptyProjectsIndex } from '@/domain/default-settings';
import { DEFAULT_DATA_ROOT_NAME, APP_SCHEMA_VERSION } from '@/lib/constants';
import { generateId, slugify, generateInstanceKey } from '@/lib/utils';

export class LocalFilesystemAdapter implements StorageAdapter {
  private dataRoot: string;
  private templatesRoot: string;
  private projectsRoot: string;
  private configRoot: string;
  private cacheRoot: string;
  private settingsPath: string;
  private projectsIndexPath: string;

  constructor() {
    this.dataRoot = join(homedir(), DEFAULT_DATA_ROOT_NAME);
    this.templatesRoot = join(this.dataRoot, 'templates');
    this.projectsRoot = join(this.dataRoot, 'projects');
    this.configRoot = join(this.dataRoot, 'config');
    this.cacheRoot = join(this.dataRoot, 'cache');
    this.settingsPath = join(this.configRoot, 'settings.json');
    this.projectsIndexPath = join(this.configRoot, 'projects-index.json');
  }

  async initEnvironment(): Promise<AppEnvironment> {
    await fs.mkdir(this.templatesRoot, { recursive: true });
    await fs.mkdir(this.projectsRoot, { recursive: true });
    await fs.mkdir(this.configRoot, { recursive: true });
    await fs.mkdir(this.cacheRoot, { recursive: true });

    const settingsExist = await this.fileExists(this.settingsPath);
    if (!settingsExist) {
      const defaultSettings = createDefaultSettings({
        dataRoot: this.dataRoot,
        templatesRoot: this.templatesRoot,
        projectsRoot: this.projectsRoot,
      });
      await this.writeSettings(defaultSettings);
    }

    const indexExists = await this.fileExists(this.projectsIndexPath);
    if (!indexExists) {
      const emptyIndex = createEmptyProjectsIndex();
      await this.writeProjectsIndex(emptyIndex);
    }

    return {
      dataRoot: this.dataRoot,
      templatesRoot: this.templatesRoot,
      projectsRoot: this.projectsRoot,
      configRoot: this.configRoot,
      cacheRoot: this.cacheRoot,
      settingsPath: this.settingsPath,
      projectsIndexPath: this.projectsIndexPath,
    };
  }

  async readSettings(): Promise<AppSettings | null> {
    try {
      const content = await this.readFile(this.settingsPath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async writeSettings(settings: AppSettings): Promise<void> {
    await this.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  async readProjectsIndex(): Promise<ProjectsIndex | null> {
    try {
      const content = await this.readFile(this.projectsIndexPath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async writeProjectsIndex(index: ProjectsIndex): Promise<void> {
    await this.writeFile(this.projectsIndexPath, JSON.stringify(index, null, 2));
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, 'utf-8');
  }

  async deleteFile(path: string): Promise<void> {
    await fs.unlink(path);
  }

  async createDirectory(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
  }

  async listDirectory(path: string): Promise<string[]> {
    return fs.readdir(path);
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await fs.copyFile(source, destination);
  }

  async deleteDirectory(path: string): Promise<void> {
    await fs.rm(path, { recursive: true, force: true });
  }

  async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.cp(source, destination, { recursive: true });
  }

  async createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    const projectId = generateId('prj');
    const slug = slugify(input.name);
    const folderName = slug;
    const projectPath = join(this.projectsRoot, folderName);
    const slidesPath = join(projectPath, 'slides');
    const now = new Date().toISOString();

    await this.createDirectory(projectPath);
    await this.createDirectory(slidesPath);

    const project: ProjectSummary = {
      id: projectId,
      name: input.name,
      slug,
      folderName,
      absolutePath: projectPath,
      createdAt: now,
      updatedAt: now,
      slideCount: 0,
      status: 'active',
    };

    const metadata: ProjectMetadata = {
      schemaVersion: APP_SCHEMA_VERSION,
      project,
      slides: [],
    };

    const metadataPath = join(projectPath, 'project.json');
    await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      index.projects.push(project);
      await this.writeProjectsIndex(index);
    }

    return project;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const index = await this.readProjectsIndex();
    return index?.projects || [];
  }

  async getProject(projectId: string): Promise<ProjectMetadata | null> {
    try {
      const projectsIndex = await this.readProjectsIndex();
      if (!projectsIndex) return null;

      const projectSummary = projectsIndex.projects.find((p) => p.id === projectId);
      if (!projectSummary) return null;

      const metadataPath = join(projectSummary.absolutePath, 'project.json');
      const metadataContent = await this.readFile(metadataPath);
      const metadata: ProjectMetadata = JSON.parse(metadataContent);

      // Auto-repair: sync metadata with actual filesystem
      const slidesPath = join(metadata.project.absolutePath, 'slides');
      try {
        const actualFiles = await fs.readdir(slidesPath);
        const htmlFiles = actualFiles.filter((f) => f.endsWith('.html') && !f.includes('.tmp'));
        
        let needsRepair = false;
        const repairedSlides: ProjectSlide[] = [];

        // Check each slide in metadata
        for (const slide of metadata.slides) {
          const fileExists = htmlFiles.includes(slide.fileName);
          if (!fileExists) {
            // Try to find by instance key
            const matchingFile = htmlFiles.find((f) => f.includes(slide.instanceKey));
            if (matchingFile) {
              slide.fileName = matchingFile;
              slide.absolutePath = join(slidesPath, matchingFile);
              needsRepair = true;
            } else {
              // File doesn't exist, skip this slide
              needsRepair = true;
              continue;
            }
          }
          repairedSlides.push(slide);
        }

        // Check for orphaned files (files that exist but aren't in metadata)
        // Auto-discover and add them to the project
        for (const file of htmlFiles) {
          const existsInMetadata = repairedSlides.some((s) => s.fileName === file);
          if (!existsInMetadata) {
            // Parse filename to extract info: 001-template-slug-instanceKey.html
            const match = file.match(/^(\d+)-(.+)-([a-z0-9]{4})\.html$/);
            if (match) {
              const [, orderStr, templateSlug, instanceKey] = match;
              
              // Create a new slide entry for this orphaned file
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
                absolutePath: join(slidesPath, file),
                createdAt: now,
                updatedAt: now,
              };
              
              repairedSlides.push(newSlide);
              needsRepair = true;
              console.log(`Auto-discovered orphaned file: ${file}`);
            } else {
              console.warn(`Orphaned file with invalid format: ${file}`);
            }
          }
        }

        if (needsRepair) {
          // Reorder slides by their current filename order
          repairedSlides.sort((a, b) => a.fileName.localeCompare(b.fileName));
          
          // Update order numbers
          repairedSlides.forEach((slide, index) => {
            slide.order = index + 1;
          });

          metadata.slides = repairedSlides;
          metadata.project.slideCount = repairedSlides.length;

          // Save repaired metadata
          await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
          
          // Update projects index
          const index = await this.readProjectsIndex();
          if (index) {
            const projectIndex = index.projects.find((p) => p.id === projectId);
            if (projectIndex) {
              projectIndex.slideCount = repairedSlides.length;
              await this.writeProjectsIndex(index);
            }
          }

          console.log(`Auto-repaired project ${projectId}: ${metadata.slides.length} slides`);
        }
      } catch (error) {
        console.error('Error during auto-repair:', error);
      }

      return metadata;
    } catch (error) {
      console.error('Error reading project:', error);
      return null;
    }
  }

  async updateProjectName(projectId: string, newName: string): Promise<void> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    metadata.project.name = newName;
    metadata.project.updatedAt = new Date().toISOString();

    const metadataPath = join(metadata.project.absolutePath, 'project.json');
    await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find((p) => p.id === projectId);
      if (projectIndex) {
        projectIndex.name = newName;
        projectIndex.updatedAt = metadata.project.updatedAt;
        await this.writeProjectsIndex(index);
      }
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    const projects = await this.listProjects();
    const project = projects.find((p) => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    await this.deleteDirectory(project.absolutePath);

    const index = await this.readProjectsIndex();
    if (index) {
      index.projects = index.projects.filter((p) => p.id !== projectId);
      await this.writeProjectsIndex(index);
    }
  }

  async duplicateProject(projectId: string, newName: string): Promise<ProjectSummary> {
    const sourceMetadata = await this.getProject(projectId);
    
    if (!sourceMetadata) {
      throw new Error('Source project not found');
    }

    const newProjectId = generateId('prj');
    const slug = slugify(newName);
    const folderName = slug;
    const newProjectPath = join(this.projectsRoot, folderName);
    const now = new Date().toISOString();

    await this.copyDirectory(sourceMetadata.project.absolutePath, newProjectPath);

    const newProject: ProjectSummary = {
      id: newProjectId,
      name: newName,
      slug,
      folderName,
      absolutePath: newProjectPath,
      createdAt: now,
      updatedAt: now,
      slideCount: sourceMetadata.project.slideCount,
      status: 'active',
    };

    const newMetadata: ProjectMetadata = {
      schemaVersion: APP_SCHEMA_VERSION,
      project: newProject,
      slides: sourceMetadata.slides.map((slide) => ({
        ...slide,
        projectId: newProjectId,
        id: generateId('slide'),
      })),
    };

    const metadataPath = join(newProjectPath, 'project.json');
    await this.writeFile(metadataPath, JSON.stringify(newMetadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      index.projects.push(newProject);
      await this.writeProjectsIndex(index);
    }

    return newProject;
  }

  async scanTemplates(): Promise<TemplateRecord[]> {
    const templates: TemplateRecord[] = [];

    try {
      const exists = await this.fileExists(this.templatesRoot);
      if (!exists) {
        return templates;
      }

      const categoryDirs = await this.listDirectory(this.templatesRoot);

      for (const categoryDir of categoryDirs) {
        const categoryPath = join(this.templatesRoot, categoryDir);
        const stat = await fs.stat(categoryPath);

        if (!stat.isDirectory()) continue;

        const files = await this.listDirectory(categoryPath);

        for (const file of files) {
          const ext = extname(file).toLowerCase();
          if (ext !== '.html' && ext !== '.htm') continue;

          const filePath = join(categoryPath, file);
          const fileName = basename(file, ext);
          const slug = slugify(fileName);

          const template: TemplateRecord = {
            id: `${categoryDir}/${slug}`,
            name: fileName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            slug,
            categoryKey: categoryDir,
            sourceFileName: file,
            sourceAbsolutePath: filePath,
            tags: [categoryDir, slug],
            isValid: true,
          };

          templates.push(template);
        }
      }
    } catch (error) {
      console.error('Error scanning templates:', error);
    }

    return templates;
  }

  async addSlideToProject(projectId: string, input: AddSlideInput): Promise<ProjectSlide> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const templates = await this.scanTemplates();
    const template = templates.find((t) => t.id === input.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const slideId = generateId('slide');
    const order = metadata.slides.length + 1;
    const instanceKey = generateInstanceKey();
    const fileName = `${String(order).padStart(3, '0')}-${template.slug}-${instanceKey}.html`;
    const slidesPath = join(metadata.project.absolutePath, 'slides');
    const slideAbsolutePath = join(slidesPath, fileName);

    await this.copyFile(template.sourceAbsolutePath, slideAbsolutePath);

    const now = new Date().toISOString();
    const slide: ProjectSlide = {
      id: slideId,
      projectId,
      order,
      title: input.title || template.name,
      templateId: input.templateId,
      templateSlug: template.slug,
      categoryKey: template.categoryKey,
      fileName,
      absolutePath: slideAbsolutePath,
      instanceKey,
      createdAt: now,
      updatedAt: now,
    };

    metadata.slides.push(slide);
    metadata.project.slideCount = metadata.slides.length;
    metadata.project.updatedAt = now;

    const metadataPath = join(metadata.project.absolutePath, 'project.json');
    await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find((p) => p.id === projectId);
      if (projectIndex) {
        projectIndex.slideCount = metadata.slides.length;
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

    const slideIndex = metadata.slides.findIndex((s) => s.id === slideId);
    if (slideIndex === -1) {
      throw new Error('Slide not found');
    }

    const slide = metadata.slides[slideIndex];
    await this.deleteFile(slide.absolutePath);

    metadata.slides.splice(slideIndex, 1);

    metadata.slides.forEach((s, idx) => {
      s.order = idx + 1;
    });

    const now = new Date().toISOString();
    metadata.project.slideCount = metadata.slides.length;
    metadata.project.updatedAt = now;

    const metadataPath = join(metadata.project.absolutePath, 'project.json');
    await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find((p) => p.id === projectId);
      if (projectIndex) {
        projectIndex.slideCount = metadata.slides.length;
        projectIndex.updatedAt = now;
        await this.writeProjectsIndex(index);
      }
    }
  }

  async duplicateSlide(projectId: string, slideId: string): Promise<ProjectSlide> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const sourceSlide = metadata.slides.find((s) => s.id === slideId);
    if (!sourceSlide) {
      throw new Error('Slide not found');
    }

    const newSlideId = generateId('slide');
    const newOrder = metadata.slides.length + 1;
    const newInstanceKey = generateInstanceKey();
    const newFileName = `${String(newOrder).padStart(3, '0')}-${sourceSlide.templateSlug}-${newInstanceKey}.html`;
    const slidesPath = join(metadata.project.absolutePath, 'slides');
    const newSlideAbsolutePath = join(slidesPath, newFileName);

    await this.copyFile(sourceSlide.absolutePath, newSlideAbsolutePath);

    const now = new Date().toISOString();
    const newSlide: ProjectSlide = {
      id: newSlideId,
      projectId,
      order: newOrder,
      title: `${sourceSlide.title} (copy)`,
      templateId: sourceSlide.templateId,
      templateSlug: sourceSlide.templateSlug,
      categoryKey: sourceSlide.categoryKey,
      fileName: newFileName,
      absolutePath: newSlideAbsolutePath,
      instanceKey: newInstanceKey,
      createdAt: now,
      updatedAt: now,
    };

    metadata.slides.push(newSlide);
    metadata.project.slideCount = metadata.slides.length;
    metadata.project.updatedAt = now;

    const metadataPath = join(metadata.project.absolutePath, 'project.json');
    await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find((p) => p.id === projectId);
      if (projectIndex) {
        projectIndex.slideCount = metadata.slides.length;
        projectIndex.updatedAt = now;
        await this.writeProjectsIndex(index);
      }
    }

    return newSlide;
  }

  async reorderSlides(projectId: string, input: ReorderSlidesInput): Promise<void> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const reorderedSlides: ProjectSlide[] = [];
    for (const slideId of input.slideIds) {
      const slide = metadata.slides.find((s) => s.id === slideId);
      if (!slide) {
        throw new Error(`Slide ${slideId} not found`);
      }
      reorderedSlides.push(slide);
    }

    const slidesPath = join(metadata.project.absolutePath, 'slides');
    
    // Verify all files exist and get actual filenames from filesystem
    const actualFiles = await fs.readdir(slidesPath);
    for (const slide of reorderedSlides) {
      const fileExists = actualFiles.includes(slide.fileName);
      if (!fileExists) {
        // Try to find the file by instance key
        const matchingFile = actualFiles.find((f) => f.includes(slide.instanceKey));
        if (matchingFile) {
          slide.fileName = matchingFile;
          slide.absolutePath = join(slidesPath, matchingFile);
        } else {
          throw new Error(`File not found for slide ${slide.id}: ${slide.fileName}`);
        }
      }
    }

    const tempSuffix = '.reorder-tmp';

    // First pass: rename all files to temporary names to avoid conflicts
    for (let i = 0; i < reorderedSlides.length; i++) {
      const slide = reorderedSlides[i];
      const tempFileName = `temp-${i}-${slide.instanceKey}.html${tempSuffix}`;
      const tempPath = join(slidesPath, tempFileName);
      
      await fs.rename(slide.absolutePath, tempPath);
      slide.absolutePath = tempPath;
    }

    // Second pass: rename to final names with correct order
    for (let i = 0; i < reorderedSlides.length; i++) {
      const slide = reorderedSlides[i];
      const newOrder = i + 1;
      const newFileName = `${String(newOrder).padStart(3, '0')}-${slide.templateSlug}-${slide.instanceKey}.html`;
      const newAbsolutePath = join(slidesPath, newFileName);

      await fs.rename(slide.absolutePath, newAbsolutePath);
      slide.absolutePath = newAbsolutePath;
      slide.fileName = newFileName;
      slide.order = newOrder;
    }

    metadata.slides = reorderedSlides;
    const now = new Date().toISOString();
    metadata.project.updatedAt = now;

    const metadataPath = join(metadata.project.absolutePath, 'project.json');
    await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const index = await this.readProjectsIndex();
    if (index) {
      const projectIndex = index.projects.find((p) => p.id === projectId);
      if (projectIndex) {
        projectIndex.updatedAt = now;
        await this.writeProjectsIndex(index);
      }
    }
  }

  async getSlideContent(projectId: string, slideId: string): Promise<string> {
    const metadata = await this.getProject(projectId);
    if (!metadata) {
      throw new Error('Project not found');
    }

    const slide = metadata.slides.find((s) => s.id === slideId);
    if (!slide) {
      throw new Error('Slide not found');
    }

    return this.readFile(slide.absolutePath);
  }
}
