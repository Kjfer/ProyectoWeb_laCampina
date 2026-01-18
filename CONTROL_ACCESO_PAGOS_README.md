# Sistema de Control de Acceso a Cursos por Pagos

## Descripción General

Este sistema permite a los administradores controlar el acceso de los estudiantes a los cursos basándose en el estado de sus pagos. Los estudiantes solo podrán acceder al contenido del curso una vez que el administrador haya verificado su pago.

## Características Principales

### Para Administradores

1. **Gestión de Pagos de Matrículas**
   - Ver el estado de pago de cada matrícula (Pendiente, Verificado, Bloqueado)
   - Habilitar acceso al curso tras verificar el pago
   - Bloquear acceso por impago
   - Agregar notas sobre el estado del pago

2. **Estados de Pago**
   - **Pendiente (pending)**: Estado inicial cuando un estudiante se matricula
   - **Verificado (verified)**: Pago confirmado, estudiante tiene acceso completo
   - **Bloqueado (blocked)**: Acceso bloqueado por impago o irregularidad

3. **Interfaz de Gestión**
   - Acceder a través de: Administración → Gestión de Estudiantes
   - Seleccionar un estudiante y hacer clic en el icono de libro para ver sus matrículas
   - Ver estado de pago con códigos de color:
     - Verde: Pago verificado
     - Amarillo: Pago pendiente
     - Rojo: Bloqueado
   - Botones para habilitar/bloquear acceso con un clic

### Para Estudiantes

1. **Acceso Controlado**
   - No podrán ver el contenido del curso si el pago está pendiente o bloqueado
   - Mensajes informativos según el estado:
     - **Pago Pendiente**: "Tu matrícula está en proceso de verificación"
     - **Bloqueado**: "Tu acceso ha sido bloqueado debido a pagos pendientes"
     - **No Matriculado**: "No estás matriculado en este curso"

2. **Protección de Contenido**
   - Todo el contenido del curso (material, tareas, exámenes) está protegido
   - Solo pueden acceder cuando `payment_status = 'verified'`

## Estructura Técnica

### Base de Datos

#### Tabla `enrollments` (course_enrollments)

Nuevos campos agregados:

```sql
- payment_status: TEXT 
  - Valores: 'pending' | 'verified' | 'blocked'
  - Por defecto: 'pending'
  
- payment_verified_by: UUID
  - Referencia al admin que verificó el pago
  
- payment_verified_at: TIMESTAMP
  - Fecha y hora de verificación
  
- payment_notes: TEXT
  - Notas adicionales sobre el pago
```

#### Función de Base de Datos

```sql
check_course_access(student_id UUID, course_id UUID) RETURNS BOOLEAN
```
Verifica si un estudiante tiene acceso a un curso basándose en el estado de matrícula y pago.

### Backend (Edge Functions)

#### `toggle-course-access`

**Endpoint**: `POST /functions/v1/toggle-course-access`

**Autenticación**: Solo administradores

**Body**:
```json
{
  "enrollment_id": "uuid",
  "payment_status": "pending" | "verified" | "blocked",
  "notes": "string (opcional)"
}
```

**Respuesta**:
```json
{
  "success": true,
  "enrollment": { ... },
  "message": "Acceso habilitado correctamente"
}
```

### Frontend

#### Componentes

1. **`AdminStudentManagement.tsx`**
   - Lista de estudiantes con sus matrículas
   - Gestión de estado de pago
   - Botones para habilitar/bloquear acceso

2. **`CourseAccessGuard.tsx`**
   - Componente que protege el acceso al contenido del curso
   - Verifica el `payment_status` del estudiante
   - Muestra mensajes apropiados según el estado

3. **`CourseDetail.tsx`**
   - Envuelto con `CourseAccessGuard`
   - Solo muestra contenido si el acceso está permitido

## Flujo de Uso

### Escenario 1: Nueva Matrícula

1. Admin matricula estudiante en un curso
2. Estado inicial: `payment_status = 'pending'`
3. Estudiante NO puede acceder al contenido
4. Estudiante ve mensaje: "Tu matrícula está en proceso de verificación"

### Escenario 2: Verificación de Pago

1. Admin recibe confirmación de pago
2. Admin va a Gestión de Estudiantes → Selecciona estudiante → Inscripciones
3. Hace clic en botón "Habilitar" junto al curso
4. Opcionalmente agrega nota (ej: "Pago recibido vía transferencia")
5. Estado cambia a: `payment_status = 'verified'`
6. Estudiante ahora tiene acceso completo al curso

### Escenario 3: Bloqueo por Impago

1. Estudiante deja de pagar cuotas pendientes
2. Admin va a la matrícula del estudiante
3. Hace clic en botón "Bloquear"
4. Agrega nota explicativa (ej: "Cuota de enero pendiente")
5. Estado cambia a: `payment_status = 'blocked'`
6. Estudiante pierde acceso inmediatamente
7. Ve mensaje: "Tu acceso ha sido bloqueado debido a pagos pendientes"

### Escenario 4: Desbloqueo tras Regularización

1. Estudiante regulariza su situación de pago
2. Admin verifica el pago
3. Hace clic en botón "Habilitar"
4. Agrega nota (ej: "Pago regularizado - enero")
5. Estado cambia a: `payment_status = 'verified'`
6. Estudiante recupera acceso al curso

## Instalación y Configuración

### 1. Aplicar Migración de Base de Datos

```bash
# Aplicar la migración
npx supabase db push

# O si usas migraciones locales
npx supabase migration up
```

### 2. Desplegar Edge Function

```bash
# Desplegar la función de control de acceso
npx supabase functions deploy toggle-course-access
```

### 3. Verificar Permisos

Asegurarse de que las políticas RLS están correctamente configuradas:

```sql
-- Los estudiantes solo pueden ver sus matrículas con pago verificado
-- Los admins y profesores pueden ver todas las matrículas
```

## Consideraciones de Seguridad

1. **Autenticación Requerida**: Todas las operaciones requieren autenticación
2. **Solo Administradores**: Solo usuarios con `role = 'admin'` pueden gestionar pagos
3. **Auditoría**: Se registra quién y cuándo se modificó el estado de pago
4. **RLS Habilitado**: Row Level Security protege los datos en la base de datos
5. **CORS Configurado**: Headers CORS apropiados en todas las funciones

## Personalización

### Modificar Estados de Pago

Si necesitas agregar más estados (ej: 'partially_paid'), actualiza:

1. La restricción CHECK en la migración
2. El tipo en `toggle-course-access/index.ts`
3. La interfaz `Enrollment` en el frontend
4. Los casos en `CourseAccessGuard.tsx`

### Cambiar Mensajes para Estudiantes

Edita `src/components/course/CourseAccessGuard.tsx`:

```tsx
// Personaliza los mensajes según tu institución
<p className="text-muted-foreground">
  Tu mensaje personalizado aquí
</p>
```

## Solución de Problemas

### Estudiante no puede acceder aunque pago está verificado

1. Verificar en la base de datos: `payment_status = 'verified'`
2. Limpiar caché del navegador
3. Verificar políticas RLS
4. Revisar console del navegador para errores

### Botones no aparecen para admin

1. Verificar que el usuario tiene `role = 'admin'`
2. Refrescar la página
3. Verificar que la función `toggle-course-access` está desplegada

### Error de CORS

1. Verificar que la función tiene los headers CORS correctos
2. Redesplegar la función: `npx supabase functions deploy toggle-course-access`

## Mejoras Futuras

1. **Panel de Pagos Dedicado**: Interfaz específica para gestión de pagos
2. **Notificaciones Automáticas**: Enviar email cuando se bloquea/habilita acceso
3. **Historial de Pagos**: Registro completo de transacciones
4. **Recordatorios Automáticos**: Alertas de pagos pendientes
5. **Integración con Pasarelas**: Pagos online automáticos
6. **Reportes de Pagos**: Dashboard con métricas de pagos

## Soporte

Para problemas o preguntas:
- Revisar los logs de Supabase
- Verificar la consola del navegador
- Consultar la documentación de Supabase
