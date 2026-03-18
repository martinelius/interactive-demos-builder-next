import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function GET() {
  try {
    const storage = getStorageAdapter();
    const projects = await storage.listProjects();
    return NextResponse.json(projects);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const storage = getStorageAdapter();
    const project = await storage.createProject({ name: name.trim() });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
