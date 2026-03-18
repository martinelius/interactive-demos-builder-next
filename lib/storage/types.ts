import type { AppEnvironment, AppSettings, ProjectsIndex, ProjectSummary, ProjectMetadata, TemplateRecord, ProjectSlide } from '@/domain/models';

export interface CreateProjectInput {
  name: string;
}

export interface AddSlideInput {
  templateId: string;
  title?: string;
}

export interface ReorderSlidesInput {
  slideIds: string[];
}

export interface StorageAdapter {
  initEnvironment(): Promise<AppEnvironment>;
  readSettings(): Promise<AppSettings | null>;
  writeSettings(settings: AppSettings): Promise<void>;
  readProjectsIndex(): Promise<ProjectsIndex | null>;
  writeProjectsIndex(index: ProjectsIndex): Promise<void>;
  createProject(input: CreateProjectInput): Promise<ProjectSummary>;
  listProjects(): Promise<ProjectSummary[]>;
  getProject(projectId: string): Promise<ProjectMetadata | null>;
  updateProjectName(projectId: string, newName: string): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  duplicateProject(projectId: string, newName: string): Promise<ProjectSummary>;
  reorderSlides(projectId: string, input: ReorderSlidesInput): Promise<void>;
  scanTemplates(): Promise<TemplateRecord[]>;
  addSlideToProject(projectId: string, input: AddSlideInput): Promise<ProjectSlide>;
  deleteSlide(projectId: string, slideId: string): Promise<void>;
  duplicateSlide(projectId: string, slideId: string): Promise<ProjectSlide>;
  getSlideContent(projectId: string, slideId: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<string[]>;
  copyFile(source: string, destination: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  copyDirectory(source: string, destination: string): Promise<void>;
}
