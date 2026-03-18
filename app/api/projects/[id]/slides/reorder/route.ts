import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { slideIds } = body;

    if (!Array.isArray(slideIds) || slideIds.length === 0) {
      return NextResponse.json({ error: 'slideIds array is required' }, { status: 400 });
    }

    const storage = getStorageAdapter();
    await storage.reorderSlides(id, { slideIds });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
