import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;
    const storage = getStorageAdapter();
    const newSlide = await storage.duplicateSlide(id, slideId);
    return NextResponse.json(newSlide, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
