import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { templateId, title } = body;

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const storage = getStorageAdapter();
    const slide = await storage.addSlideToProject(id, { templateId, title });
    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
