import type { AppEnvironment, ProjectSummary, ProjectMetadata, TemplateRecord, ProjectSlide } from '@/domain/models';

export async function initializeEnvironment(): Promise<AppEnvironment> {
  const response = await fetch('/api/environment/init', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to initialize environment');
  }

  return response.json();
}

export async function createProject(name: string): Promise<ProjectSummary> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create project');
  }

  return response.json();
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const response = await fetch('/api/projects');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list projects');
  }

  return response.json();
}

export async function getProject(projectId: string): Promise<ProjectMetadata> {
  const response = await fetch(`/api/projects/${projectId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get project');
  }

  return response.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete project');
  }
}

export async function duplicateProject(projectId: string, newName: string): Promise<ProjectSummary> {
  const response = await fetch(`/api/projects/${projectId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to duplicate project');
  }

  return response.json();
}

export async function listTemplates(): Promise<TemplateRecord[]> {
  const response = await fetch('/api/templates');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list templates');
  }

  return response.json();
}

export async function addSlideToProject(projectId: string, templateId: string, title?: string): Promise<ProjectSlide> {
  const response = await fetch(`/api/projects/${projectId}/slides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, title }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add slide');
  }

  return response.json();
}

export async function deleteSlide(projectId: string, slideId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/slides/${slideId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete slide');
  }
}

export async function duplicateSlide(projectId: string, slideId: string): Promise<ProjectSlide> {
  const response = await fetch(`/api/projects/${projectId}/slides/${slideId}/duplicate`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to duplicate slide');
  }

  return response.json();
}

export async function getSlideContent(projectId: string, slideId: string): Promise<string> {
  const response = await fetch(`/api/projects/${projectId}/slides/${slideId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get slide content');
  }

  return response.text();
}

export async function reorderSlides(projectId: string, slideIds: string[]): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/slides/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slideIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reorder slides');
  }
}
