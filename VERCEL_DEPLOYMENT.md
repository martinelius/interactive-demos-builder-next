# Deployment a Vercel

Esta guía te ayudará a deployar la aplicación Interactive Demos Builder en Vercel usando Vercel Blob Storage.

## Requisitos Previos

1. Cuenta de Vercel (gratuita): https://vercel.com
2. Vercel CLI instalado (opcional): `npm i -g vercel`
3. Templates preparados para subir a Blob Storage

## Paso 1: Crear Proyecto en Vercel

### Opción A: Desde el Dashboard (Recomendado)

1. Ve a https://vercel.com/new
2. Importa tu repositorio de GitHub/GitLab/Bitbucket
3. O sube el proyecto manualmente

### Opción B: Desde la CLI

```bash
cd /Users/alejandro/CascadeProjects/interactive-demos-builder-next
vercel
```

## Paso 2: Configurar Vercel Blob Storage

1. Ve a tu proyecto en Vercel Dashboard
2. Click en **Storage** en el menú lateral
3. Click en **Create Database**
4. Selecciona **Blob** 
5. Asigna un nombre (ej: `demos-builder-storage`)
6. Click en **Create**

Vercel automáticamente creará la variable de entorno `BLOB_READ_WRITE_TOKEN`.

## Paso 3: Subir Templates a Blob Storage

Necesitas subir tus templates HTML a Vercel Blob antes del primer deploy.

### Script de Migración

Crea un archivo `scripts/upload-templates.ts`:

```typescript
import { put } from '@vercel/blob';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function uploadTemplates() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN not set');
  }

  const templatesPath = '/Users/alejandro/InteractiveDemosBuilderData/templates';
  const categories = await readdir(templatesPath);

  const templates = [];

  for (const category of categories) {
    const categoryPath = join(templatesPath, category);
    const files = await readdir(categoryPath);

    for (const file of files) {
      if (!file.endsWith('.html')) continue;

      const filePath = join(categoryPath, file);
      const content = await readFile(filePath, 'utf-8');
      
      // Upload to Blob
      const blobPath = `templates/${category}/${file}`;
      await put(blobPath, content, {
        access: 'public',
        token,
      });

      console.log(`✓ Uploaded: ${blobPath}`);

      // Parse template info
      const slug = file.replace('.html', '');
      templates.push({
        id: `tpl_${slug}`,
        name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        slug,
        categoryKey: category,
        tags: [],
        absolutePath: blobPath,
      });
    }
  }

  // Upload templates index
  await put('templates-index.json', JSON.stringify({ templates }, null, 2), {
    access: 'public',
    token,
  });

  console.log(`\n✓ Uploaded ${templates.length} templates`);
  console.log('✓ Created templates-index.json');
}

uploadTemplates().catch(console.error);
```

### Ejecutar el Script

```bash
# Instala ts-node si no lo tienes
npm install -D ts-node

# Configura el token (obtenerlo de Vercel Dashboard > Storage > Blob)
export BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Ejecuta el script
npx ts-node scripts/upload-templates.ts
```

## Paso 4: Variables de Entorno

En Vercel Dashboard > Settings > Environment Variables, verifica que esté configurado:

- `BLOB_READ_WRITE_TOKEN` (automático al crear Blob Storage)
- `NODE_ENV=production` (automático)

## Paso 5: Deploy

### Opción A: Desde Git (Recomendado)

1. Haz commit y push de tus cambios
2. Vercel automáticamente detectará el push y hará deploy

```bash
git add .
git commit -m "Add Vercel Blob support"
git push origin main
```

### Opción B: Desde la CLI

```bash
vercel --prod
```

## Paso 6: Verificar Deployment

1. Ve a la URL de tu deployment (ej: `https://your-app.vercel.app`)
2. Verifica que:
   - La app carga correctamente
   - Puedes crear proyectos
   - Los templates aparecen en la lista
   - Puedes agregar slides a proyectos

## Arquitectura en Vercel

```
Vercel Blob Storage
├── settings.json                    # App settings
├── projects-index.json              # Lista de proyectos
├── templates-index.json             # Lista de templates
├── projects/
│   └── {projectId}/
│       ├── project.json             # Metadata del proyecto
│       └── slides/
│           ├── 001-*.html
│           ├── 002-*.html
│           └── 003-*.html
└── templates/
    ├── home-dashboard/
    │   ├── analytics-view.html
    │   └── dashboard-main.html
    ├── record/
    │   └── person-detail.html
    └── dashboards/
        └── performance-kpis.html
```

## Diferencias con Local

| Feature | Local (Development) | Vercel (Production) |
|---------|-------------------|-------------------|
| Storage | Filesystem (`~/InteractiveDemosBuilderData`) | Vercel Blob Storage |
| Adapter | `LocalFilesystemAdapter` | `VercelBlobAdapter` |
| Templates | Escaneados del filesystem | Cargados desde `templates-index.json` |
| Auto-discovery | ✅ Soportado | ✅ Soportado |
| Costo | Gratis | Gratis (1GB incluido) |

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is required"

**Solución:** Verifica que la variable de entorno esté configurada en Vercel Dashboard.

### Templates no aparecen

**Solución:** Ejecuta el script de migración para subir los templates a Blob Storage.

### Error 500 al crear proyecto

**Solución:** Revisa los logs en Vercel Dashboard > Deployments > [tu deployment] > Logs.

## Desarrollo Local vs Producción

Durante desarrollo, la app seguirá usando el filesystem local:

```bash
# Development (usa LocalFilesystemAdapter)
npm run dev

# Production build (usa VercelBlobAdapter si BLOB_READ_WRITE_TOKEN está set)
npm run build
npm start
```

## Costos

**Vercel Blob Storage:**
- Plan gratuito: 1GB de storage
- Después: $0.15/GB/mes

**Vercel Hosting:**
- Plan gratuito: 100GB bandwidth/mes
- Serverless Functions: 100 horas/mes

Para la mayoría de casos de uso, el plan gratuito es suficiente.

## Próximos Pasos

1. ✅ Deploy completado
2. Considera agregar autenticación (Vercel Auth, Clerk, etc.)
3. Configura un dominio custom
4. Agrega analytics (Vercel Analytics)
5. Configura CI/CD con GitHub Actions

## Soporte

Si tienes problemas, revisa:
- Vercel Docs: https://vercel.com/docs
- Vercel Blob Docs: https://vercel.com/docs/storage/vercel-blob
- GitHub Issues del proyecto
