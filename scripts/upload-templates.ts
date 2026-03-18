import { put } from '@vercel/blob';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Script to upload templates from local filesystem to Vercel Blob Storage
 * 
 * Usage:
 * 1. Set BLOB_READ_WRITE_TOKEN environment variable
 * 2. Run: npx ts-node scripts/upload-templates.ts
 */

async function uploadTemplates() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
  }

  const templatesPath = join(process.env.HOME || '', 'InteractiveDemosBuilderData', 'templates');
  console.log(`📁 Reading templates from: ${templatesPath}\n`);

  const categories = await readdir(templatesPath);
  const templates = [];
  let uploadCount = 0;

  for (const category of categories) {
    // Skip hidden files and system files
    if (category.startsWith('.')) continue;

    const categoryPath = join(templatesPath, category);
    
    // Check if it's a directory
    const { stat } = await import('fs/promises');
    const stats = await stat(categoryPath).catch(() => null);
    if (!stats || !stats.isDirectory()) continue;

    console.log(`📂 Processing category: ${category}`);
    
    const files = await readdir(categoryPath);

    for (const file of files) {
      if (!file.endsWith('.html')) continue;

      const filePath = join(categoryPath, file);
      const content = await readFile(filePath, 'utf-8');
      
      // Upload to Blob (use private access since store is private)
      const blobPath = `templates/${category}/${file}`;
      await put(blobPath, content, {
        access: 'private',
        token,
      });

      uploadCount++;
      console.log(`  ✓ Uploaded: ${file}`);

      // Parse template info
      const slug = file.replace('.html', '');
      const name = slug
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      templates.push({
        id: `tpl_${slug}_${Math.random().toString(36).substring(2, 8)}`,
        name,
        slug,
        categoryKey: category,
        tags: [],
        absolutePath: blobPath,
      });
    }
  }

  // Upload templates index
  console.log('\n📝 Creating templates index...');
  await put('templates-index.json', JSON.stringify({ templates }, null, 2), {
    access: 'private',
    token,
  });

  console.log('\n✅ Upload complete!');
  console.log(`   - ${uploadCount} templates uploaded`);
  console.log(`   - ${categories.length} categories processed`);
  console.log(`   - templates-index.json created`);
}

uploadTemplates().catch((error) => {
  console.error('\n❌ Error uploading templates:', error);
  process.exit(1);
});
