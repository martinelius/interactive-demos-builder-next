'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { initializeEnvironment, createProject, listProjects, deleteProject, duplicateProject, listTemplates, getProject, addSlideToProject, deleteSlide as apiDeleteSlide, duplicateSlide as apiDuplicateSlide, getSlideContent, reorderSlides as apiReorderSlides } from '@/lib/api-client';
import type { AppEnvironment, ProjectSummary, TemplateRecord, TemplateCategory, ProjectMetadata, ProjectSlide } from '@/domain/models';

export function AppShell() {
  const { view, setView, categories } = useAppStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    loadProjects();
    loadTemplates();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const data = await listTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const stats = useMemo(
    () => ({
      projectCount: projects.length,
      templateCount: templates.length,
      categoryCount: categories.length,
    }),
    [projects, templates, categories],
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-950/80 px-4 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Local desktop app</p>
          <h1 className="mt-2 text-xl font-semibold">Interactive Demos Builder</h1>
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          {[
            ['projects', 'Projects'],
            ['settings', 'Settings'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`rounded-xl px-3 py-2 text-left transition ${
                view === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
              onClick={() => setView(key as any)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-sm font-medium">Status</p>
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            <p>{stats.projectCount} {stats.projectCount === 1 ? 'project' : 'projects'}</p>
            <p>{stats.templateCount} {stats.templateCount === 1 ? 'template' : 'templates'}</p>
            <p>{stats.categoryCount} categories</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        {view === 'projects' && <ProjectsHome projects={projects} isLoading={isLoadingProjects} onRefresh={loadProjects} onOpenProject={(projectId: string) => { setActiveProjectId(projectId); setView('editor'); }} />}
        {view === 'editor' && activeProject && <ProjectEditor project={activeProject} templates={templates} categories={categories} isLoadingTemplates={isLoadingTemplates} onClose={() => { setActiveProjectId(null); setView('projects'); }} />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

function ProjectsHome({ projects, isLoading, onRefresh, onOpenProject }: { projects: ProjectSummary[]; isLoading: boolean; onRefresh: () => void; onOpenProject: (projectId: string) => void }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      setIsCreating(true);
      await createProject(newProjectName.trim());
      setNewProjectName('');
      setShowCreateDialog(false);
      await onRefresh();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (projectId: string, projectName: string) => {
    const newName = prompt(`Duplicate "${projectName}" as:`, `${projectName} (copy)`);
    if (!newName) return;

    try {
      await duplicateProject(projectId, newName);
      await onRefresh();
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      alert(error instanceof Error ? error.message : 'Failed to duplicate project');
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    const confirmed = confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteProject(projectId);
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Phase 2 complete</p>
          <h2 className="text-3xl font-semibold">Projects</h2>
        </div>
        <button
          className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400"
          onClick={() => setShowCreateDialog(true)}
        >
          New project
        </button>
      </header>

      {showCreateDialog && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h3 className="text-lg font-semibold">Create New Project</h3>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleCreateProject}
              disabled={isCreating || !newProjectName.trim()}
              className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreateDialog(false);
                setNewProjectName('');
              }}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 py-12 text-center">
          <p className="text-lg text-slate-400">No projects yet</p>
          <p className="mt-2 text-sm text-slate-500">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {project.slideCount} slides
                </span>
              </div>
              <div className="mt-5 flex gap-2">
                <button 
                  onClick={() => onOpenProject(project.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
                >
                  Open
                </button>
                <button
                  onClick={() => handleDuplicate(project.id, project.name)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDelete(project.id, project.name)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectEditor({ 
  project, 
  templates, 
  categories, 
  isLoadingTemplates,
  onClose
}: { 
  project: ProjectSummary; 
  templates: TemplateRecord[]; 
  categories: TemplateCategory[]; 
  isLoadingTemplates: boolean;
  onClose: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [selectedSlide, setSelectedSlide] = useState<ProjectSlide | null>(null);
  const [slideContent, setSlideContent] = useState<string>('');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRecord | null>(null);
  const [templatePreviewContent, setTemplatePreviewContent] = useState<string>('');
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [dragOverSlideId, setDragOverSlideId] = useState<string | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [project.id]);

  useEffect(() => {
    if (selectedSlide) {
      loadSlideContent(selectedSlide);
    } else {
      setSlideContent('');
    }
  }, [selectedSlide]);

  const loadProjectData = async () => {
    try {
      setIsLoadingProject(true);
      const data = await getProject(project.id);
      setProjectMetadata(data);
      if (data.slides.length > 0) {
        setSelectedSlide(data.slides[0]);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const loadSlideContent = async (slide: ProjectSlide) => {
    try {
      const content = await getSlideContent(project.id, slide.id);
      setSlideContent(content);
    } catch (error) {
      console.error('Failed to load slide content:', error);
      setSlideContent('<p>Error loading slide content</p>');
    }
  };

  const handleAddSlide = async (templateId: string) => {
    try {
      await addSlideToProject(project.id, templateId);
      await loadProjectData();
    } catch (error) {
      console.error('Failed to add slide:', error);
      alert(error instanceof Error ? error.message : 'Failed to add slide');
    }
  };

  const handleDuplicateSlide = async (slideId: string) => {
    try {
      await apiDuplicateSlide(project.id, slideId);
      await loadProjectData();
    } catch (error) {
      console.error('Failed to duplicate slide:', error);
      alert(error instanceof Error ? error.message : 'Failed to duplicate slide');
    }
  };

  const handleDeleteSlide = async (slideId: string, slideTitle: string) => {
    const confirmed = confirm(`Delete slide "${slideTitle}"?`);
    if (!confirmed) return;

    try {
      await apiDeleteSlide(project.id, slideId);
      if (selectedSlide?.id === slideId) {
        setSelectedSlide(null);
      }
      await loadProjectData();
    } catch (error) {
      console.error('Failed to delete slide:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete slide');
    }
  };

  const handlePreviewTemplate = async (template: TemplateRecord) => {
    try {
      setPreviewTemplate(template);
      const response = await fetch(`/api/templates/${encodeURIComponent(template.id)}/preview`);
      if (response.ok) {
        const content = await response.text();
        setTemplatePreviewContent(content);
      } else {
        setTemplatePreviewContent('<p>Error loading template preview</p>');
      }
    } catch (error) {
      console.error('Failed to load template preview:', error);
      setTemplatePreviewContent('<p>Error loading template preview</p>');
    }
  };

  const closeTemplatePreview = () => {
    setPreviewTemplate(null);
    setTemplatePreviewContent('');
  };

  const handleDragStart = (e: React.DragEvent, slideId: string) => {
    setDraggedSlideId(slideId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, slideId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlideId(slideId);
  };

  const handleDragLeave = () => {
    setDragOverSlideId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSlideId: string) => {
    e.preventDefault();
    setDragOverSlideId(null);

    if (!draggedSlideId || draggedSlideId === targetSlideId || !projectMetadata) {
      setDraggedSlideId(null);
      return;
    }

    const draggedIndex = projectMetadata.slides.findIndex((s) => s.id === draggedSlideId);
    const targetIndex = projectMetadata.slides.findIndex((s) => s.id === targetSlideId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSlideId(null);
      return;
    }

    const newSlides = [...projectMetadata.slides];
    const [draggedSlide] = newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIndex, 0, draggedSlide);

    const newSlideIds = newSlides.map((s) => s.id);

    try {
      await apiReorderSlides(project.id, newSlideIds);
      await loadProjectData();
    } catch (error) {
      console.error('Failed to reorder slides:', error);
      alert(error instanceof Error ? error.message : 'Failed to reorder slides');
    } finally {
      setDraggedSlideId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedSlideId(null);
    setDragOverSlideId(null);
  };

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (selectedCategory) {
      filtered = filtered.filter((t) => t.categoryKey === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.slug.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  const templatesByCategory = useMemo(() => {
    const grouped = new Map<string, number>();
    templates.forEach((t) => {
      grouped.set(t.categoryKey, (grouped.get(t.categoryKey) || 0) + 1);
    });
    return grouped;
  }, [templates]);

  return (
    <section className="flex h-full min-h-[80vh] flex-col gap-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span>←</span>
            <span>Back to Projects</span>
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-400">All changes saved</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={projectMetadata?.project.name || project.name}
              onChange={(e) => {
                if (projectMetadata) {
                  projectMetadata.project.name = e.target.value;
                  setProjectMetadata({...projectMetadata});
                }
              }}
              onBlur={async () => {
                if (projectMetadata) {
                  try {
                    const response = await fetch(`/api/projects/${project.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: projectMetadata.project.name }),
                    });
                    if (!response.ok) throw new Error('Failed to update project name');
                  } catch (error) {
                    console.error('Failed to update project name:', error);
                  }
                }
              }}
              className="text-3xl font-bold bg-transparent border-none outline-none text-white hover:bg-slate-900/50 focus:bg-slate-900 rounded px-2 py-1 -ml-2 transition"
            />
            <p className="mt-2 text-sm text-slate-400">
              {projectMetadata?.slides.length || 0} {projectMetadata?.slides.length === 1 ? 'slide' : 'slides'} in flow
            </p>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-4 xl:grid-cols-2">
        <Panel title="Template Library" subtitle={`${filteredTemplates.length} templates found`}>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${
                  selectedCategory === null
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                All ({templates.length})
              </button>

              {isLoadingTemplates ? (
                <div className="py-1 text-xs text-slate-500">Loading...</div>
              ) : (
                categories.map((category) => {
                  const count = templatesByCategory.get(category.key) || 0;
                  return (
                    <button
                      key={category.key}
                      onClick={() => setSelectedCategory(category.key)}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${
                        selectedCategory === category.key
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {category.label} ({count})
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto">
            {isLoadingTemplates ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {searchQuery ? 'No templates match your search' : 'No templates in this category'}
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 truncate">{template.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{template.categoryKey}</p>
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handlePreviewTemplate(template)}
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 transition"
                      >
                        Preview
                      </button>
                      <button 
                        onClick={() => handleAddSlide(template.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Project Slides" subtitle={`${projectMetadata?.slides.length || 0} slides in flow`}>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {isLoadingProject ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading slides...</div>
            ) : !projectMetadata || projectMetadata.slides.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No slides yet. Add templates from the library.
              </div>
            ) : (
              projectMetadata.slides.map((slide) => (
                <div
                  key={slide.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, slide.id)}
                  onDragOver={(e) => handleDragOver(e, slide.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, slide.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedSlide(slide)}
                  className={`cursor-move rounded-xl border px-4 py-3 transition ${
                    selectedSlide?.id === slide.id
                      ? 'border-emerald-500 bg-emerald-950/30'
                      : dragOverSlideId === slide.id && draggedSlideId !== slide.id
                      ? 'border-emerald-400 bg-emerald-950/20'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  } ${draggedSlideId === slide.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{String(slide.order).padStart(3, '0')}</span>
                        <p className="font-medium text-slate-100 truncate">{slide.title}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{slide.categoryKey}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSlide(slide.id);
                        }}
                        className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                      >
                        Dup
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(slide.id, slide.title);
                        }}
                        className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {previewTemplate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeTemplatePreview}
        >
          <div 
            className="relative h-full w-full max-w-7xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{previewTemplate.name}</h3>
                  <p className="text-sm text-slate-400">{previewTemplate.categoryKey}</p>
                </div>
                <button
                  onClick={closeTemplatePreview}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <iframe
                  srcDoc={templatePreviewContent}
                  className="h-full w-full rounded-lg border-0 bg-white"
                  sandbox="allow-scripts"
                  title="Template Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SettingsView() {
  const [environment, setEnvironment] = useState<AppEnvironment | null>(null);
  const [status, setStatus] = useState('Environment not initialized yet');
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      setStatus('Initializing local environment...');
      const result = await initializeEnvironment();
      setEnvironment(result);
      setStatus('Local environment ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
      setStatus(`Initialization failed: ${message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Phase 1 target</p>
        <h2 className="text-3xl font-semibold">Settings</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Paths" subtitle="Data roots and local directories">
          <div className="space-y-3 text-sm text-slate-300">
            <SettingRow label="Data root" value={environment?.dataRoot ?? 'Pending initialization'} />
            <SettingRow label="Templates root" value={environment?.templatesRoot ?? 'Pending initialization'} />
            <SettingRow label="Projects root" value={environment?.projectsRoot ?? 'Pending initialization'} />
          </div>
        </Panel>

        <Panel title="Safety" subtitle="Deletion and integrity behaviour">
          <div className="space-y-3 text-sm text-slate-300">
            <SettingRow label="Confirm before deleting slide" value="Enabled" />
            <SettingRow label="Confirm before deleting project" value="Enabled" />
            <SettingRow label="Auto repair on open" value="Disabled" />
          </div>
        </Panel>
      </div>

      <Panel title="Environment Bootstrap" subtitle="Create local folders and seed config files">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3 text-sm text-slate-300">
            {status}
          </div>
          <button
            className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isInitializing}
            onClick={handleInitialize}
          >
            {isInitializing ? 'Initializing...' : 'Initialize local environment'}
          </button>
          {environment && (
            <div className="grid gap-3 md:grid-cols-2">
              <SettingRow label="Config root" value={environment.configRoot} />
              <SettingRow label="Cache root" value={environment.cacheRoot} />
              <SettingRow label="Settings file" value={environment.settingsPath} />
              <SettingRow label="Projects index" value={environment.projectsIndexPath} />
            </div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-slate-950/30">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="truncate ml-2">{value}</span>
    </div>
  );
}
