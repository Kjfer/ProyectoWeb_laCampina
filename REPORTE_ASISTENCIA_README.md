# Reporte de Asistencia para Administradores

## Descripción

Esta funcionalidad permite a los usuarios con rol **administrador** generar reportes de asistencia de estudiantes por curso y fecha específica, con la capacidad de exportar los datos en formato Excel.

## Características Implementadas

### 1. Generación de Reportes
- **Filtro por Curso**: Seleccionar cualquier curso disponible en el sistema
- **Filtro por Fecha**: Seleccionar una fecha específica para consultar la asistencia
- **Visualización Completa**: Muestra todos los estudiantes matriculados en el curso seleccionado

### 2. Estadísticas en Tiempo Real
El reporte muestra estadísticas detalladas:
- **Total de Estudiantes**: Cantidad total matriculada en el curso
- **Presentes**: Estudiantes que asistieron
- **Ausentes**: Estudiantes que no asistieron
- **Tardíos**: Estudiantes que llegaron tarde
- **Excusados**: Estudiantes con ausencia justificada
- **Sin Registrar**: Estudiantes sin registro de asistencia para esa fecha

### 3. Listados Detallados
- **Tabla de Estudiantes Ausentes**: Lista específica de estudiantes inasistentes
- **Tabla Completa**: Registro de todos los estudiantes con su estado de asistencia
- Cada registro incluye:
  - Nombre completo del estudiante
  - Email
  - Estado de asistencia (con badges de color)
  - Notas adicionales
  - Fecha y hora de registro

### 4. Exportación a Excel
El sistema genera un archivo Excel (.xlsx) con tres hojas:
- **Resumen**: Información del curso, fecha y estadísticas generales
- **Todos los Estudiantes**: Lista completa con todos los detalles
- **Estudiantes Ausentes**: Lista filtrada de inasistentes

El archivo se nombra automáticamente como: `Asistencia_[CODIGO_CURSO]_[FECHA].xlsx`

## Archivos Creados/Modificados

### Nuevos Archivos

1. **`supabase/functions/get-attendance-report/index.ts`**
   - Edge function de Supabase para consultar datos de asistencia
   - Valida permisos de administrador
   - Obtiene información del curso y estudiantes matriculados
   - Consulta registros de asistencia para la fecha especificada
   - Calcula estadísticas y genera el reporte

2. **`src/pages/AdminAttendanceReport.tsx`**
   - Componente React principal de la funcionalidad
   - Interfaz de usuario con selectores de curso y fecha
   - Visualización de estadísticas y tablas
   - Función de exportación a Excel

### Archivos Modificados

3. **`src/App.tsx`**
   - Agregada importación de `AdminAttendanceReport`
   - Nueva ruta: `/admin/attendance-report` (protegida para administradores)

4. **`src/pages/AdminDashboard.tsx`**
   - Importado `useNavigate` de react-router-dom
   - Agregado ícono `ClipboardList` de lucide-react
   - Nuevo botón "Reporte de Asistencia" en la pestaña de Reportes
   - Navegación al componente de reporte de asistencia

## Cómo Usar

1. **Acceso**: Iniciar sesión como administrador
2. **Navegación**: 
   - Ir al Dashboard de Administrador
   - Seleccionar la pestaña "Reportes"
   - Hacer clic en "Reporte de Asistencia"
3. **Generar Reporte**:
   - Seleccionar un curso del dropdown
   - Seleccionar una fecha usando el calendario
   - Hacer clic en "Generar Reporte"
4. **Exportar**:
   - Una vez generado el reporte, hacer clic en "Exportar a Excel"
   - El archivo se descargará automáticamente

## Tecnologías Utilizadas

- **React**: Framework de frontend
- **TypeScript**: Tipado estático
- **Supabase**: Backend y base de datos
- **Deno**: Runtime para edge functions
- **xlsx**: Librería para generar archivos Excel
- **date-fns**: Manejo de fechas
- **shadcn/ui**: Componentes de interfaz de usuario
- **Lucide React**: Iconos

## Estructura de Datos

### Tabla: `attendance`
```sql
- id: UUID
- course_id: UUID (referencia a courses)
- student_id: UUID (referencia a profiles)
- date: DATE
- status: TEXT ('present', 'absent', 'late', 'excused')
- notes: TEXT
- recorded_by: UUID (referencia a profiles)
- created_at: TIMESTAMP
```

### Tabla: `courses`
```sql
- id: UUID
- name: TEXT
- code: TEXT
- teacher_id: UUID
- academic_year: TEXT
- semester: TEXT
- is_active: BOOLEAN
```

### Tabla: `enrollments`
```sql
- id: UUID
- course_id: UUID
- student_id: UUID
```

## Permisos y Seguridad

- Solo usuarios con rol `admin` pueden acceder a esta funcionalidad
- La edge function valida el rol del usuario antes de procesar la solicitud
- La ruta está protegida con `ProtectedRoute` y `allowedRoles={["admin"]}`

## Notas Adicionales

- Los estudiantes sin registro de asistencia para la fecha seleccionada aparecen con estado "Sin registrar"
- El reporte incluye solo estudiantes matriculados en el curso
- La exportación a Excel utiliza formato de fechas español (dd/MM/yyyy)
- Las estadísticas se calculan en tiempo real basándose en los datos de asistencia

## Próximas Mejoras Sugeridas

- Reporte de asistencia por rango de fechas
- Gráficos de tendencias de asistencia
- Filtrado por programa académico
- Envío automático de reportes por email
- Programación de reportes recurrentes
