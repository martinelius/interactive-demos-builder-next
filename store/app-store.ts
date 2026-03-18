import { create } from 'zustand';
import type { ProjectSummary, TemplateCategory, TemplateRecord } from '@/domain/models';
import type { AppView } from '@/types/ui';
import { defaultCategories } from '@/domain/default-settings';

const mockProjects: ProjectSummary[] = [
  {
    id: 'prj_demo_deloitte',
    name: 'Demo Deloitte',
    slug: 'demo-deloitte',
    folderName: 'demo-deloitte',
    absolutePath: '/InteractiveDemosBuilderData/projects/demo-deloitte',
    createdAt: '2026-03-15',
    updatedAt: '2026-03-16',
    slideCount: 7,
    status: 'active',
  },
  {
    id: 'prj_demo_finance',
    name: 'Demo Finance Ops',
    slug: 'demo-finance-ops',
    folderName: 'demo-finance-ops',
    absolutePath: '/InteractiveDemosBuilderData/projects/demo-finance-ops',
    createdAt: '2026-03-12',
    updatedAt: '2026-03-14',
    slideCount: 4,
    status: 'active',
  },
];

const mockTemplates: TemplateRecord[] = [
  {
    id: 'tpl_home_dashboard_v1',
    name: 'Home Dashboard',
    slug: 'home-dashboard',
    categoryKey: 'home-dashboard',
    sourceFileName: 'home-dashboard.html',
    sourceAbsolutePath: '/InteractiveDemosBuilderData/templates/home-dashboard/home-dashboard.html',
    tags: ['home', 'dashboard'],
    isValid: true,
  },
  {
    id: 'tpl_list_default_v1',
    name: 'List',
    slug: 'list-default',
    categoryKey: 'listas',
    sourceFileName: 'list-default.html',
    sourceAbsolutePath: '/InteractiveDemosBuilderData/templates/list-default/list-default.html',
    tags: ['list'],
    isValid: true,
  },
  {
    id: 'tpl_person_record_3col',
    name: 'Person Record 3 Columns',
    slug: 'person-record-3col',
    categoryKey: 'record',
    sourceFileName: 'person-record-3col.html',
    sourceAbsolutePath: '/InteractiveDemosBuilderData/templates/person-record-3col/person-record-3col.html',
    tags: ['record', 'person'],
    isValid: true,
  },
  {
    id: 'tpl_settings_main_v1',
    name: 'Settings',
    slug: 'settings-main',
    categoryKey: 'settings',
    sourceFileName: 'settings-main.html',
    sourceAbsolutePath: '/InteractiveDemosBuilderData/templates/settings-main/settings-main.html',
    tags: ['settings'],
    isValid: true,
  },
  {
    id: 'tpl_workflows_default_v1',
    name: 'Workflows',
    slug: 'workflows-default',
    categoryKey: 'workflows',
    sourceFileName: 'workflows-default.html',
    sourceAbsolutePath: '/InteractiveDemosBuilderData/templates/workflows-default/workflows-default.html',
    tags: ['workflows'],
    isValid: true,
  },
];

interface AppState {
  view: AppView;
  categories: TemplateCategory[];
  projects: ProjectSummary[];
  templates: TemplateRecord[];
  setView: (view: AppView) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'projects',
  categories: defaultCategories,
  projects: mockProjects,
  templates: mockTemplates,
  setView: (view) => set({ view }),
}));
