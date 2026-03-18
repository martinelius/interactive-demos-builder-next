import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storage = getStorageAdapter();
    const templates = await storage.scanTemplates();
    const template = templates.find((t) => t.id === decodeURIComponent(id));

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const content = await storage.readFile(template.sourceAbsolutePath);
    return new Response(content, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
