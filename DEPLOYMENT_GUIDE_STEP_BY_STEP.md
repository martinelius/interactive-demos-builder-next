# Guía de Deployment Paso a Paso - Vercel

Esta es tu guía completa para deployar Interactive Demos Builder en Vercel. Vamos a hacerlo juntos, paso a paso.

---

## 📋 PASO 1: Crear cuenta en Vercel (5 minutos)

### 1.1 Ir a Vercel
1. Abre tu navegador
2. Ve a: **https://vercel.com**
3. Click en el botón **"Sign Up"** (arriba a la derecha)

### 1.2 Registrarte
Tienes 3 opciones (elige la que prefieras):
- **GitHub** (recomendado) - Click en "Continue with GitHub"
- **GitLab** - Click en "Continue with GitLab"
- **Email** - Ingresa tu email

**Recomendación:** Usa GitHub porque lo vamos a necesitar después.

### 1.3 Autorizar Vercel
Si elegiste GitHub:
1. Te va a pedir autorizar Vercel
2. Click en **"Authorize Vercel"**
3. Listo, ya tienes cuenta en Vercel ✅

---

## 📋 PASO 2: Preparar el código para GitHub (10 minutos)

### 2.1 Verificar que tienes Git instalado
Abre tu terminal y ejecuta:
```bash
git --version
```

**¿Qué debería pasar?**
- ✅ Si ves algo como `git version 2.x.x` → Perfecto, continúa
- ❌ Si dice "command not found" → Instala Git desde https://git-scm.com/downloads

### 2.2 Inicializar Git en tu proyecto
En la terminal, ve a tu proyecto:
```bash
cd /Users/alejandro/CascadeProjects/interactive-demos-builder-next
```

Inicializa Git:
```bash
git init
```

**¿Qué debería pasar?**
Deberías ver: `Initialized empty Git repository in ...`

### 2.3 Crear archivo .gitignore
Ya existe un `.gitignore` en tu proyecto, pero vamos a verificar que tenga lo necesario:

```bash
cat .gitignore
```

**Debe incluir al menos:**
```
node_modules
.next
.env.local
.DS_Store
```

Si no existe o falta algo, créalo/edítalo.

### 2.4 Hacer el primer commit
```bash
# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Interactive Demos Builder"
```

**¿Qué debería pasar?**
Verás un resumen de archivos agregados.

---

## 📋 PASO 3: Subir código a GitHub (10 minutos)

### 3.1 Crear repositorio en GitHub

1. Ve a **https://github.com**
2. Si no tienes cuenta, créala (usa el mismo email que Vercel)
3. Click en el botón **"+"** (arriba a la derecha)
4. Click en **"New repository"**

### 3.2 Configurar el repositorio

**Llena los campos:**
- **Repository name:** `interactive-demos-builder-next`
- **Description:** (opcional) "Interactive Demos Builder - Next.js version"
- **Public o Private:** Elige lo que prefieras (ambos funcionan)
- **NO marques** "Initialize this repository with a README"
- **NO agregues** .gitignore ni license

Click en **"Create repository"**

### 3.3 Conectar tu código local con GitHub

GitHub te va a mostrar instrucciones. Copia y pega estos comandos en tu terminal:

```bash
# Agregar el remote (reemplaza con TU URL)
git remote add origin https://github.com/TU-USUARIO/interactive-demos-builder-next.git

# Cambiar a branch main
git branch -M main

# Subir el código
git push -u origin main
```

**¿Qué debería pasar?**
Verás una barra de progreso subiendo archivos. Al final dirá algo como:
```
To https://github.com/...
 * [new branch]      main -> main
```

### 3.4 Verificar en GitHub
1. Refresca la página de GitHub
2. Deberías ver todos tus archivos ahí ✅

---

## 📋 PASO 4: Conectar GitHub con Vercel (5 minutos)

### 4.1 Ir al Dashboard de Vercel
1. Ve a **https://vercel.com/dashboard**
2. Deberías ver tu dashboard vacío

### 4.2 Crear nuevo proyecto
1. Click en **"Add New..."** (botón azul)
2. Click en **"Project"**

### 4.3 Importar repositorio de GitHub
1. Verás una lista de tus repositorios de GitHub
2. Busca **"interactive-demos-builder-next"**
3. Click en **"Import"** al lado del repositorio

**Si no ves tus repositorios:**
1. Click en **"Adjust GitHub App Permissions"**
2. Autoriza a Vercel a acceder a tus repositorios
3. Refresca la página

### 4.4 Configurar el proyecto

Vercel detectará automáticamente que es Next.js. Verás:

**Framework Preset:** Next.js ✅ (detectado automáticamente)

**Root Directory:** ./ (déjalo así)

**Build Command:** `npm run build` ✅

**Output Directory:** `.next` ✅

**Install Command:** `npm install` ✅

**NO CAMBIES NADA** - Vercel ya lo configuró correctamente.

### 4.5 NO HAGAS DEPLOY TODAVÍA

**IMPORTANTE:** NO hagas click en "Deploy" todavía.

Primero necesitamos configurar Vercel Blob Storage.

---

## 📋 PASO 5: Configurar Vercel Blob Storage (5 minutos)

### 5.1 Ir a Storage
1. En el dashboard de Vercel, busca en el menú lateral izquierdo
2. Click en **"Storage"**

### 5.2 Crear Blob Storage
1. Click en **"Create Database"**
2. Selecciona **"Blob"** (el ícono de una nube)
3. **Store Name:** `demos-builder-storage` (o el nombre que quieras)
4. Click en **"Create"**

**¿Qué debería pasar?**
Vercel creará el Blob Storage y te mostrará la configuración.

### 5.3 Conectar con tu proyecto
1. En la página del Blob Storage que acabas de crear
2. Busca la sección **"Connect Project"**
3. Selecciona tu proyecto: **"interactive-demos-builder-next"**
4. Click en **"Connect"**

**¿Qué hace esto?**
Automáticamente agrega la variable de entorno `BLOB_READ_WRITE_TOKEN` a tu proyecto.

### 5.4 Verificar el token
1. Ve a tu proyecto en Vercel
2. Click en **"Settings"** (arriba)
3. Click en **"Environment Variables"** (menú lateral)
4. Deberías ver `BLOB_READ_WRITE_TOKEN` con un valor que empieza con `vercel_blob_rw_...` ✅

---

## 📋 PASO 6: Migrar templates a Vercel Blob (10 minutos)

Ahora necesitamos subir tus templates HTML a Vercel Blob Storage.

### 6.1 Copiar el token de Blob
1. En Vercel Dashboard → Settings → Environment Variables
2. Busca `BLOB_READ_WRITE_TOKEN`
3. Click en el ícono del ojo para ver el valor
4. Click en **"Copy"** para copiar el token completo

### 6.2 Configurar el token localmente
En tu terminal, ejecuta (reemplaza con TU token):

```bash
export BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXX"
```

**IMPORTANTE:** Reemplaza `vercel_blob_rw_XXXXXXXXXX` con el token que copiaste.

### 6.3 Verificar que tienes templates
```bash
ls -la ~/InteractiveDemosBuilderData/templates
```

**¿Qué debería pasar?**
Deberías ver carpetas con tus categorías de templates.

### 6.4 Ejecutar el script de migración
```bash
npm run upload-templates
```

**¿Qué debería pasar?**
Verás algo como:
```
📁 Reading templates from: /Users/alejandro/InteractiveDemosBuilderData/templates

📂 Processing category: home-dashboard
  ✓ Uploaded: analytics-view.html
  ✓ Uploaded: dashboard-main.html

📂 Processing category: record
  ✓ Uploaded: person-detail.html

✅ Upload complete!
   - 9 templates uploaded
   - 3 categories processed
   - templates-index.json created
```

**Si hay error:**
- Verifica que el token esté bien copiado
- Verifica que la ruta de templates exista
- Pídeme ayuda con el error específico

---

## 📋 PASO 7: Hacer el primer deploy (5 minutos)

### 7.1 Ir a tu proyecto en Vercel
1. Ve a **https://vercel.com/dashboard**
2. Click en tu proyecto **"interactive-demos-builder-next"**

### 7.2 Hacer deploy
1. Click en **"Deployments"** (arriba)
2. Click en **"Deploy"** (botón azul)
3. O simplemente haz un push a GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

**¿Qué debería pasar?**
Vercel automáticamente detectará el push y empezará a hacer build.

### 7.3 Esperar el build
Verás una pantalla con:
- ⏳ Building... (1-3 minutos)
- ✅ Build successful
- 🚀 Deploying...
- ✅ Deployment ready

**Tiempo estimado:** 2-4 minutos

---

## 📋 PASO 8: Verificar que todo funciona (5 minutos)

### 8.1 Abrir tu aplicación
1. Cuando el deploy termine, verás un botón **"Visit"**
2. Click en **"Visit"**
3. O copia la URL (algo como `https://interactive-demos-builder-next.vercel.app`)

### 8.2 Verificar funcionalidad

**Checklist:**
- [ ] La página carga correctamente
- [ ] Puedes crear un nuevo proyecto
- [ ] Los templates aparecen en la lista
- [ ] Puedes agregar slides a un proyecto
- [ ] Puedes editar el nombre del proyecto
- [ ] Puedes hacer drag & drop de slides
- [ ] Puedes duplicar slides
- [ ] Puedes eliminar slides

### 8.3 Si algo no funciona
1. Ve a Vercel Dashboard → tu proyecto → **"Logs"**
2. Busca errores en rojo
3. Copia el error y pídeme ayuda

---

## 🎉 ¡LISTO!

Tu aplicación está deployada en Vercel con Vercel Blob Storage.

### URLs importantes:
- **Tu app:** https://[tu-proyecto].vercel.app
- **Dashboard Vercel:** https://vercel.com/dashboard
- **Repositorio GitHub:** https://github.com/[tu-usuario]/interactive-demos-builder-next

### Próximos pasos opcionales:
1. **Dominio custom:** Configura un dominio personalizado en Vercel
2. **Analytics:** Activa Vercel Analytics para ver estadísticas
3. **Autenticación:** Agrega login con Clerk o NextAuth

---

## 🆘 Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is required"
**Solución:** Ve a Vercel → Settings → Environment Variables y verifica que el token esté configurado.

### Error: "Templates not found"
**Solución:** Ejecuta nuevamente `npm run upload-templates` con el token correcto.

### Error 500 al crear proyecto
**Solución:** Revisa los logs en Vercel Dashboard → Deployments → [tu deploy] → Logs.

### La app no carga
**Solución:** 
1. Verifica que el build haya sido exitoso
2. Revisa los logs de runtime
3. Verifica que todas las variables de entorno estén configuradas

---

## 📞 Necesitas ayuda?

Si en algún paso tienes problemas:
1. Copia el mensaje de error exacto
2. Dime en qué paso estás
3. Te ayudaré a resolverlo

¡Vamos paso a paso! 🚀
