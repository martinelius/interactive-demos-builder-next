import { NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

export async function POST() {
  try {
    const storage = getStorageAdapter();
    const environment = await storage.initEnvironment();
    return NextResponse.json(environment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
