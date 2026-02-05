# 📚 Peri Institute - Intranet Educational Platform

Sistema de gestión académica completo para Peri Institute con módulos de cursos, matrículas, pagos, materiales y notificaciones.

---

## 🎯 Características Principales

### ✅ Gestión Académica
- **Programas y Ediciones**: Catálogo de cursos organizados por programas
- **Módulos**: División de cursos en módulos con horarios y profesores
- **Matrículas**: Registro y seguimiento de estudiantes
- **Cursos Grabados**: Venta y gestión de contenido en video

### ✅ Sistema de Evaluación
- **Tareas (Assignments)**: Creación, entrega y calificación
- **Exámenes**: Evaluaciones con límite de tiempo
- **Calificaciones**: Seguimiento del progreso académico

### ✅ Gestión de Pagos
- **Registro de Pagos**: Múltiples métodos y monedas
- **Cuotas**: Sistema de pagos parciales
- **Materiales**: Books y kits con control de pago
- **Reportes**: Estados de cuenta y análisis

### ✅ Sistema de Notificaciones 🆕
- **Automáticas**: Tareas, exámenes, materiales nuevos
- **Pagos**: Recordatorios y confirmaciones
- **Tiempo Real**: Actualización instantánea
- **Programadas**: Verificaciones diarias automáticas

### ✅ Gestión de Usuarios
- **Roles**: Estudiante, Tutor, Admin, Directivo
- **Perfiles**: Información completa de usuarios
- **Autenticación**: Sistema seguro con Supabase Auth

---

## 📂 Estructura del Proyecto

```
ProyectoWeb_laCampina/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Notifications.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── assignments/
│   │   ├── calendar/
│   │   ├── course/
│   │   ├── dashboard/
│   │   └── ui/             # Componentes shadcn/ui
│   ├── hooks/              # Custom React Hooks
│   │   ├── useAuth.tsx
│   │   ├── useNotifications.tsx
│   │   └── useExamMonitor.tsx
│   ├── pages/              # Páginas principales
│   │   ├── NotificationsPage.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── DirectivoDashboard.tsx
│   │   └── ...
│   ├── integrations/       # Integraciones (Supabase)
│   └── lib/                # Utilidades
├── supabase/
│   ├── migrations/         # Migraciones SQL
│   │   ├── 20260205000000_update_notifications_system.sql
│   │   └── 20260205000001_notifications_rls_and_cron.sql
│   └── test_notifications.sql
├── NUEVO_MODELO_PERI_INSTITUTE.md
├── SISTEMA_NOTIFICACIONES_README.md
├── IMPLEMENTACION_NOTIFICACIONES.md
└── NOTIFICACIONES_RESUMEN.md
```

---

## 🚀 Inicio Rápido

### Prerequisitos
- Node.js 18+ y npm
- Cuenta en Supabase
- Git

### Instalación

```bash
# 1. Clonar el repositorio
git clone <YOUR_GIT_URL>
cd ProyectoWeb_laCampina

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crear archivo .env.local con:
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# 4. Ejecutar migraciones en Supabase
# - Ir a Supabase Dashboard > SQL Editor
# - Ejecutar los archivos en supabase/migrations/

# 5. Iniciar servidor de desarrollo
npm run dev
```

---

## 🔧 Configuración de Supabase

### 1. Ejecutar Migraciones
En Supabase SQL Editor, ejecutar en orden:
1. Todas las migraciones existentes
2. `20260205000000_update_notifications_system.sql`
3. `20260205000001_notifications_rls_and_cron.sql`

### 2. Habilitar Extensiones
- **pg_cron**: Para tareas programadas
- **pgvector** (si se usa): Para búsqueda semántica

### 3. Configurar Realtime
En Database > Replication, habilitar para:
- `notifications`
- `assignments`
- `exams`

### 4. Verificar RLS
Asegurarse de que Row Level Security está habilitado en todas las tablas.

---

## 📖 Documentación por Módulo

### Sistema de Notificaciones
- **Documentación Técnica**: [SISTEMA_NOTIFICACIONES_README.md](SISTEMA_NOTIFICACIONES_README.md)
- **Guía de Implementación**: [IMPLEMENTACION_NOTIFICACIONES.md](IMPLEMENTACION_NOTIFICACIONES.md)
- **Resumen Ejecutivo**: [NOTIFICACIONES_RESUMEN.md](NOTIFICACIONES_RESUMEN.md)

### Modelo de Datos
- **Documentación Completa**: [NUEVO_MODELO_PERI_INSTITUTE.md](NUEVO_MODELO_PERI_INSTITUTE.md)

### Otros Módulos
- **Calendario de Eventos**: [CALENDARIO_EVENTOS_README.md](CALENDARIO_EVENTOS_README.md)
- **Dashboard Directivo**: [DIRECTIVO_DASHBOARD_README.md](DIRECTIVO_DASHBOARD_README.md)
- **Importación Masiva**: [IMPORTACION_MASIVA_README.md](IMPORTACION_MASIVA_README.md)

---

## 🎨 Stack Tecnológico

### Frontend
- **React 18** con TypeScript
- **Vite** como build tool
- **TailwindCSS** para estilos
- **shadcn/ui** componentes UI
- **React Router** para navegación
- **date-fns** para manejo de fechas
- **Lucide React** para iconos

### Backend/Database
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Row Level Security (RLS)** para seguridad
- **pg_cron** para tareas programadas
- **Edge Functions** (próximamente)

### Herramientas
- **ESLint** para linting
- **TypeScript** para type safety
- **Git** para control de versiones

---

## 👥 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **Estudiante** | Ver cursos, tareas, exámenes, materiales. Recibir notificaciones. |
| **Tutor** | Todo lo del estudiante + calificar tareas de sus estudiantes. |
| **Admin** | Gestión completa de cursos, usuarios, matrículas, pagos. |
| **Directivo** | Dashboard ejecutivo, métricas, reportes, visualización general. |

---

## 🔔 Sistema de Notificaciones

### Tipos de Notificaciones
- **Tareas**: Nuevas, por vencer, vencidas
- **Exámenes**: Nuevos, por vencer, calificados
- **Materiales**: Nuevos materiales y recursos
- **Pagos**: Pendientes, confirmados, recordatorios

### Características
- ✅ Notificaciones en tiempo real
- ✅ Badge con contador en navbar
- ✅ Triggers automáticos
- ✅ Tareas programadas diarias
- ✅ Vista completa con filtros
- ✅ Metadata contextual

---

## 🧪 Testing

### Probar Notificaciones
```sql
-- Ejecutar en Supabase SQL Editor
-- Scripts en supabase/test_notifications.sql
```

### Scripts de Desarrollo
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Preview del build
npm run lint         # Ejecutar ESLint
```

---

## 📊 Monitoreo

### Consultas Útiles

```sql
-- Ver notificaciones recientes
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 20;

-- Estadísticas de notificaciones
SELECT * FROM get_notification_stats(7);

-- Verificar tareas programadas
SELECT * FROM cron.job;

-- Ver triggers activos
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%notify%';
```

---

## 🐛 Solución de Problemas

### Notificaciones no aparecen
1. Verificar que RLS permite SELECT
2. Comprobar que Realtime está habilitado
3. Revisar consola del navegador

### Triggers no funcionan
1. Verificar que los triggers existen y están activos
2. Comprobar que las tablas tienen los campos requeridos
3. Revisar logs de Supabase

### Tareas programadas no se ejecutan
1. Verificar que pg_cron está habilitado
2. Comprobar que las tareas están activas
3. Revisar `cron.job_run_details` para logs

---

## 🚀 Despliegue

### Producción con Vercel
```bash
# Conectar repositorio con Vercel
# Configurar variables de entorno
# Deploy automático en cada push
```

### Variables de Entorno Requeridas
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## 📝 Próximas Funcionalidades

- [ ] Notificaciones push móviles
- [ ] Envío de emails automáticos
- [ ] Dashboard de analytics avanzado
- [ ] Sistema de chat en vivo
- [ ] App móvil nativa
- [ ] Integración con Zoom/Teams
- [ ] Sistema de asistencia biométrica
- [ ] Reportes PDF personalizados

---

## 📄 Licencia

Este proyecto es propietario de Peri Institute.

---

## 📞 Soporte

Para soporte técnico, consulta la documentación o contacta al equipo de desarrollo.

**Última actualización**: Febrero 2026
