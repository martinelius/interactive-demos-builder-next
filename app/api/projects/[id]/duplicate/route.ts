import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'New project name is required' }, { status: 400 });
    }

    const storage = getStorageAdapter();
    const newProject = await storage.duplicateProject(id, name.trim());
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
