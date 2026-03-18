import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function GET() {
  try {
    const storage = getStorageAdapter();
    const templates = await storage.scanTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
