export interface TemplateCategory {
  key: string;
  label: string;
  order: number;
  description?: string;
}

export interface TemplateRecord {
  id: string;
  name: string;
  slug: string;
  categoryKey: string;
  sourceFileName: string;
  sourceAbsolutePath: string;
  previewImagePath?: string;
  description?: string;
  tags: string[];
  isValid: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  folderName: string;
  absolutePath: string;
  createdAt: string;
  updatedAt: string;
  slideCount: number;
  status: 'active' | 'archived';
}

export interface ProjectSlide {
  id: string;
  projectId: string;
  order: number;
  title: string;
  templateId: string;
  templateSlug: string;
  categoryKey: string;
  fileName: string;
  absolutePath: string;
  instanceKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMetadata {
  schemaVersion: number;
  project: ProjectSummary;
  slides: ProjectSlide[];
}

export interface ProjectsIndex {
  schemaVersion: number;
  projects: ProjectSummary[];
}

export interface AppSettings {
  schemaVersion: number;
  dataRoot: string;
  templatesRoot: string;
  projectsRoot: string;
  lastOpenedProjectId?: string;
  confirmBeforeDeleteSlide: boolean;
  confirmBeforeDeleteProject: boolean;
  autoRepairOnOpen: boolean;
  preview: {
    openInInternalViewer: boolean;
    sandbox: boolean;
  };
  categories: TemplateCategory[];
}

export interface AppEnvironment {
  dataRoot: string;
  templatesRoot: string;
  projectsRoot: string;
  configRoot: string;
  cacheRoot: string;
  settingsPath: string;
  projectsIndexPath: string;
}
