import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;
    const storage = getStorageAdapter();
    await storage.deleteSlide(id, slideId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;
    const storage = getStorageAdapter();
    const content = await storage.getSlideContent(id, slideId);
    return new Response(content, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
