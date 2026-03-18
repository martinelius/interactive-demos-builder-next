import type { AppSettings, ProjectsIndex, TemplateCategory } from './models';
import { APP_SCHEMA_VERSION } from '@/lib/constants';

export const defaultCategories: TemplateCategory[] = [
  { key: 'home-dashboard', label: 'Home / Dashboard', order: 1 },
  { key: 'record', label: 'Record', order: 2 },
  { key: 'listas', label: 'Listas', order: 3 },
  { key: 'settings', label: 'Settings', order: 4 },
  { key: 'libraries', label: 'Libraries', order: 5 },
  { key: 'workflows', label: 'Workflows', order: 6 },
  { key: 'dashboards', label: 'Dashboards', order: 7 },
];

export function createDefaultSettings(paths: {
  dataRoot: string;
  templatesRoot: string;
  projectsRoot: string;
}): AppSettings {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    dataRoot: paths.dataRoot,
    templatesRoot: paths.templatesRoot,
    projectsRoot: paths.projectsRoot,
    confirmBeforeDeleteSlide: true,
    confirmBeforeDeleteProject: true,
    autoRepairOnOpen: false,
    preview: {
      openInInternalViewer: true,
      sandbox: true,
    },
    categories: defaultCategories,
  };
}

export function createEmptyProjectsIndex(): ProjectsIndex {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    projects: [],
  };
}
