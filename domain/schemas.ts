import { z } from 'zod';

export const templateCategorySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});

export const templateRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  categoryKey: z.string().min(1),
  sourceFileName: z.string().min(1),
  sourceAbsolutePath: z.string().min(1),
  previewImagePath: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  isValid: z.boolean(),
});

export const projectSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  folderName: z.string().min(1),
  absolutePath: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  slideCount: z.number().int().nonnegative(),
  status: z.enum(['active', 'archived']),
});

export const projectSlideSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  templateId: z.string().min(1),
  templateSlug: z.string().min(1),
  categoryKey: z.string().min(1),
  fileName: z.string().min(1),
  absolutePath: z.string().min(1),
  instanceKey: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const projectMetadataSchema = z.object({
  schemaVersion: z.number().int().positive(),
  project: projectSummarySchema,
  slides: z.array(projectSlideSchema),
});

export const projectsIndexSchema = z.object({
  schemaVersion: z.number().int().positive(),
  projects: z.array(projectSummarySchema),
});

export const appSettingsSchema = z.object({
  schemaVersion: z.number().int().positive(),
  dataRoot: z.string().min(1),
  templatesRoot: z.string().min(1),
  projectsRoot: z.string().min(1),
  lastOpenedProjectId: z.string().optional(),
  confirmBeforeDeleteSlide: z.boolean(),
  confirmBeforeDeleteProject: z.boolean(),
  autoRepairOnOpen: z.boolean(),
  preview: z.object({
    openInInternalViewer: z.boolean(),
    sandbox: z.boolean(),
  }),
  categories: z.array(templateCategorySchema),
});
