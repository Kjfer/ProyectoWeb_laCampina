# 📚 Índice de Documentación - Peri Institute

Guía rápida para encontrar toda la documentación del proyecto.

---

## 🎯 Documentación Principal

### 📘 Inicio Rápido
- **[README_COMPLETO.md](README_COMPLETO.md)** - Guía completa del proyecto
  - Stack tecnológico
  - Instalación y configuración
  - Estructura del proyecto
  - Comandos útiles

---

## 🏗️ Arquitectura y Modelo de Datos

### 📊 Base de Datos
- **[NUEVO_MODELO_PERI_INSTITUTE.md](NUEVO_MODELO_PERI_INSTITUTE.md)** - Modelo de datos completo
  - Estructura de tablas
  - Relaciones
  - Lógica de negocio
  - Ejemplos de uso

---

## 🔔 Sistema de Notificaciones

### Documentación Técnica
- **[SISTEMA_NOTIFICACIONES_README.md](SISTEMA_NOTIFICACIONES_README.md)** - Documentación técnica
  - Tipos de notificaciones
  - Triggers automáticos
  - Funciones de base de datos
  - Estructura de datos
  - Consultas útiles
  - Métricas y monitoreo

### Guía de Implementación
- **[IMPLEMENTACION_NOTIFICACIONES.md](IMPLEMENTACION_NOTIFICACIONES.md)** - Paso a paso
  - Instrucciones de instalación
  - Configuración de Supabase
  - Integración en frontend
  - Checklist de verificación
  - Solución de problemas
  - Personalización

### Resumen Ejecutivo
- **[NOTIFICACIONES_RESUMEN.md](NOTIFICACIONES_RESUMEN.md)** - Vista rápida
  - Archivos creados
  - Tipos implementados
  - Características principales
  - Instrucciones rápidas

---

## 📅 Otros Módulos

### Calendario de Eventos
- **[CALENDARIO_EVENTOS_README.md](CALENDARIO_EVENTOS_README.md)**
  - Sistema de calendario
  - Eventos y recordatorios
  - Integración con cursos

### Dashboard Directivo
- **[DIRECTIVO_DASHBOARD_README.md](DIRECTIVO_DASHBOARD_README.md)**
  - Métricas ejecutivas
  - KPIs del instituto
  - Reportes visuales

### Métricas
- **[METRICAS_DIRECTIVO.md](METRICAS_DIRECTIVO.md)**
  - Indicadores clave
  - Análisis de datos
  - Dashboards

### Importación Masiva
- **[IMPORTACION_MASIVA_README.md](IMPORTACION_MASIVA_README.md)**
  - Carga de estudiantes
  - Formato CSV
  - Validaciones

### Credenciales de Estudiantes
- **[CREDENCIALES_ESTUDIANTES.md](CREDENCIALES_ESTUDIANTES.md)**
  - Generación automática
  - Gestión de accesos
  - Recuperación de contraseñas

---

## 🗂️ Archivos SQL

### Migraciones
```
supabase/migrations/
├── 20260205000000_update_notifications_system.sql
└── 20260205000001_notifications_rls_and_cron.sql
```

### Scripts de Prueba
```
supabase/
├── test_notifications.sql
├── test_trigger.sql
├── diagnostico-rls-401.sql
└── fix-attendance-rls.sql
```

---

## 💻 Código Fuente

### Componentes Principales

#### Notificaciones
- `src/components/Notifications.tsx` - Vista principal
- `src/components/NotificationBell.tsx` - Badge en navbar
- `src/hooks/useNotifications.tsx` - Lógica de negocio
- `src/pages/NotificationsPage.tsx` - Página completa

#### Dashboard
- `src/pages/AdminDashboard.tsx` - Dashboard administrativo
- `src/pages/DirectivoDashboard.tsx` - Dashboard directivo

#### Gestión Académica
- `src/pages/AdminCourseManagement.tsx` - Gestión de cursos
- `src/pages/AdminModulosManagement.tsx` - Gestión de módulos
- `src/pages/AdminMatriculasManagement.tsx` - Gestión de matrículas

#### Evaluaciones
- `src/pages/Assignments.tsx` - Tareas
- `src/pages/Exams.tsx` - Exámenes
- `src/pages/GradingView.tsx` - Calificaciones

#### Pagos
- `src/pages/AdminPagosManagement.tsx` - Gestión de pagos
- `src/pages/AdminMaterialesManagement.tsx` - Materiales

---

## 🔍 Búsqueda Rápida

### Por Tema

#### ¿Cómo implementar notificaciones?
→ [IMPLEMENTACION_NOTIFICACIONES.md](IMPLEMENTACION_NOTIFICACIONES.md)

#### ¿Qué tipos de notificaciones existen?
→ [SISTEMA_NOTIFICACIONES_README.md](SISTEMA_NOTIFICACIONES_README.md) (sección "Tipos de Notificaciones")

#### ¿Cómo funciona el modelo de datos?
→ [NUEVO_MODELO_PERI_INSTITUTE.md](NUEVO_MODELO_PERI_INSTITUTE.md)

#### ¿Cómo crear una nueva migración?
→ Crear archivo en `supabase/migrations/` siguiendo el patrón de nombres

#### ¿Cómo probar el sistema?
→ [test_notifications.sql](supabase/test_notifications.sql)

#### ¿Problemas con notificaciones?
→ [IMPLEMENTACION_NOTIFICACIONES.md](IMPLEMENTACION_NOTIFICACIONES.md) (sección "Solución de Problemas")

#### ¿Cómo personalizar la UI?
→ [IMPLEMENTACION_NOTIFICACIONES.md](IMPLEMENTACION_NOTIFICACIONES.md) (sección "Personalización Visual")

#### ¿Consultas SQL útiles?
→ [SISTEMA_NOTIFICACIONES_README.md](SISTEMA_NOTIFICACIONES_README.md) (sección "Métricas y Monitoreo")

---

## 📊 Diagramas y Esquemas

### Modelo de Datos
```
NUEVO_MODELO_PERI_INSTITUTE.md
└── Sección: Estructura del Modelo de Datos
```

### Flujo de Notificaciones
```
SISTEMA_NOTIFICACIONES_README.md
└── Sección: Triggers Automáticos
```

---

## 🎓 Tutoriales y Ejemplos

### Crear Notificación Manual
```sql
-- Ver: test_notifications.sql, Ejemplo #1
SELECT create_notification(...);
```

### Notificar a Estudiantes de un Módulo
```sql
-- Ver: test_notifications.sql, Ejemplo #2
SELECT notify_modulo_students(...);
```

### Verificar Pagos Pendientes
```sql
-- Ver: test_notifications.sql, Ejemplo #10
SELECT check_pending_payments();
```

---

## 🛠️ Herramientas de Desarrollo

### Supabase
- Dashboard: https://app.supabase.com
- Documentación: https://supabase.com/docs

### React + Vite
- Vite Docs: https://vitejs.dev
- React Docs: https://react.dev

### TailwindCSS
- Documentación: https://tailwindcss.com

### shadcn/ui
- Componentes: https://ui.shadcn.com

---

## 📝 Checklist de Referencia Rápida

### Implementar Notificaciones
- [ ] Ejecutar migraciones SQL
- [ ] Habilitar pg_cron
- [ ] Agregar NotificationBell al navbar
- [ ] Agregar ruta /notifications
- [ ] Habilitar Realtime
- [ ] Probar triggers
- [ ] Verificar tareas cron

Ver checklist completo: [IMPLEMENTACION_NOTIFICACIONES.md](IMPLEMENTACION_NOTIFICACIONES.md)

---

## 🔗 Enlaces Útiles

### Proyecto
- URL del proyecto: Ver README.md original

### Integraciones
- Supabase Project: [Configurar en .env]
- Workflow n8n: [n8n-workflow-example.json](n8n-workflow-example.json)

---

## 📞 Contacto y Soporte

Para soporte técnico:
1. Revisar documentación correspondiente
2. Verificar logs en Supabase
3. Consultar sección "Solución de Problemas"
4. Contactar equipo de desarrollo

---

## 🔄 Última Actualización

- **Fecha**: Febrero 2026
- **Versión**: 2.0
- **Cambios Recientes**:
  - ✅ Sistema de notificaciones completo
  - ✅ Triggers automáticos
  - ✅ Tareas programadas
  - ✅ Componentes React actualizados
  - ✅ Documentación extensa

---

## 📌 Navegación Rápida por Documentos

| Documento | Propósito | Audiencia |
|-----------|-----------|-----------|
| README_COMPLETO.md | Overview general | Todos |
| NUEVO_MODELO_PERI_INSTITUTE.md | Arquitectura DB | Desarrolladores |
| SISTEMA_NOTIFICACIONES_README.md | Documentación técnica | Desarrolladores |
| IMPLEMENTACION_NOTIFICACIONES.md | Guía de instalación | Implementadores |
| NOTIFICACIONES_RESUMEN.md | Vista ejecutiva | Gestores/Directivos |
| Este archivo (INDICE.md) | Navegación | Todos |

---

**¡Toda la documentación está organizada y accesible desde este índice!** 📚
