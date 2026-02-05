# Gestión de Eventos Académicos

## Cómo Crear Eventos en el Calendario

### Para Administradores

Los administradores pueden crear eventos académicos desde la página de Calendario:

1. **Acceder al Calendario**
   - Navegar a "Calendario" desde el menú lateral
   
2. **Crear un Nuevo Evento**
   - Hacer clic en el botón "+ Nuevo Evento" en la parte superior derecha
   - Se abrirá un diálogo de creación de eventos

3. **Completar los Datos del Evento**
   - **Título**: Nombre descriptivo del evento
   - **Descripción**: Detalles adicionales sobre el evento
   - **Tipo de Evento**: Seleccionar entre:
     - Vacaciones
     - Feriado
     - Examen (eventos generales, no exámenes de curso)
     - Reunión
     - Otro
   - **Fecha y Hora de Inicio**: Cuándo comienza el evento
   - **Fecha y Hora de Fin**: Cuándo termina el evento

4. **Guardar el Evento**
   - Hacer clic en "Crear Evento"
   - El evento se publicará automáticamente y será visible para todos los usuarios

### Tipos de Eventos en el Sistema

El sistema maneja diferentes tipos de eventos:

#### 1. Eventos Académicos (academic_events)
- **Creados por**: Administradores
- **Visibles para**: Todos los usuarios
- **Ejemplos**: Vacaciones escolares, feriados, reuniones institucionales
- **Ubicación**: Tabla `academic_events`

#### 2. Tareas (assignments)
- **Creados por**: Profesores y administradores
- **Visibles para**: Estudiantes inscritos en el módulo correspondiente
- **Ejemplos**: Tareas de cada módulo/curso
- **Ubicación**: Tabla `assignments`
- **Filtrado**: Por `modulo_id` según las inscripciones del estudiante

#### 3. Exámenes (exams)
- **Creados por**: Profesores y administradores
- **Visibles para**: Estudiantes inscritos en el módulo correspondiente
- **Ejemplos**: Exámenes programados para cada módulo
- **Ubicación**: Tabla `exams`
- **Filtrado**: Por `modulo_id` según las inscripciones del estudiante

## Visualización del Calendario

### En el Dashboard Principal
- Muestra los **próximos 5 eventos** de la semana actual
- Incluye eventos académicos, tareas y exámenes
- Cards compactas con información esencial
- Click para navegar al detalle

### En la Página de Calendario
- Vista completa con calendario mensual
- Fechas con eventos marcadas con un punto indicador
- Al seleccionar una fecha, se muestran todos los eventos de ese día
- Secciones separadas por tipo:
  - Eventos del Colegio (azul)
  - Tareas Pendientes (naranja)
  - Exámenes Programados (rojo)

## Permisos

### Administradores
- ✅ Crear eventos académicos
- ✅ Ver todos los eventos, tareas y exámenes
- ✅ Editar y eliminar eventos académicos

### Profesores
- ✅ Ver eventos académicos
- ✅ Crear tareas y exámenes en sus módulos
- ✅ Ver tareas y exámenes de sus módulos

### Estudiantes
- ✅ Ver eventos académicos
- ✅ Ver sus tareas asignadas (filtradas por módulo)
- ✅ Ver sus exámenes (filtrados por módulo)
- ❌ No pueden crear eventos

### Padres
- ✅ Ver eventos académicos
- ✅ Ver eventos de sus hijos (próximamente)

## Estructura de Base de Datos

### Tabla: academic_events
```sql
- id: UUID
- title: TEXT (requerido)
- description: TEXT
- event_type: ENUM (vacation, holiday, exam, meeting, other)
- start_date: TIMESTAMP WITH TIME ZONE
- end_date: TIMESTAMP WITH TIME ZONE
- is_published: BOOLEAN (default: false)
- created_by: UUID (referencia a profiles)
```

### Componentes Relacionados

1. **EventDialog.tsx** - Diálogo para crear eventos académicos
2. **AcademicCalendar.tsx** - Vista completa del calendario con eventos
3. **UpcomingEvents.tsx** - Widget compacto para dashboard
4. **Calendar.tsx** - Página principal del calendario

## Mejoras Futuras

- [ ] Edición de eventos existentes
- [ ] Eliminación de eventos
- [ ] Eventos recurrentes
- [ ] Notificaciones de eventos próximos
- [ ] Exportar calendario (iCal, Google Calendar)
- [ ] Vista de padres con eventos de hijos
- [ ] Filtros avanzados por tipo de evento
