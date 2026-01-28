# Nuevo Modelo de Negocio - Peri Institute

## 📋 Descripción General

Este documento describe el modelo de datos reorganizado para Peri Institute, adaptado a la lógica de negocio específica de la institución. El modelo implementa una estructura jerárquica de **Programas → Ediciones → Módulos** con un sistema completo de matrículas, pagos y gestión de materiales.

---

## 🗂️ Estructura del Modelo de Datos

### 1. **Programas (catalogo_cursos)**
Catálogo de programas educativos disponibles.

**Campos:**
- `id`: UUID único
- `name`: Nombre del programa
- `code`: Código único del programa (ej: PROG001)
- `description`: Descripción del programa
- `is_active`: Estado activo/inactivo
- `created_at`, `updated_at`: Timestamps

**Ejemplo:** "Programación Básica" con código "PROG001"

---

### 2. **Courses (Ediciones)**
Instancias específicas de los programas en períodos determinados.

**Campos:**
- `id`: UUID único
- `name`: Nombre de la edición
- `description`: Descripción
- `code`: **Código auto-generado** → `program_id + "-" + MES + "-" + AÑO`  
  Ejemplo: `PROG001-ENE-2026`
- `program_id`: Relación con tabla programas
- `teacher_principal_id`: Profesor responsable
- `academic_year`: Año académico (ej: 2026)
- `semester`: Semestre (I, II, Verano)
- `is_active`: Estado activo/inactivo
- `start_date`, `end_date`: Fechas de inicio y fin
- `numero_modulos`: Cantidad de módulos (1-20)
- `material`: Tipo de material asociado (`book`, `kit`, `none`)
- `created_at`, `updated_at`: Timestamps

**Ejemplo:** Edición "Programación Básica - Enero 2026" con 6 módulos

---

### 3. **Módulos**
Divisiones de cada edición del curso.

**Campos:**
- `id`: UUID único
- `name`: Nombre del módulo
- `num_modulo`: Número del módulo (1, 2, 3...)
- `description`: Descripción
- `code`: **Código auto-generado** → `program_id + "-M" + num + "-" + MES + "-" + AÑO`  
  Ejemplo: `PROG001-M1-ENE-2026`
- `course_id`: Relación con edición
- `teacher_principal_id`: Profesor responsable
- `academic_year`: Año académico
- `semester_year`: Año-Semestre
- `is_active`: Estado
- `start_date`, `end_date`: Fechas del módulo
- `schedule`: JSONB con horario semanal  
  ```json
  {
    "Lunes": "10:00-12:00",
    "Miércoles": "14:00-16:00"
  }
  ```
- `aditional_teachers`: Array de UUIDs de profesores adicionales
- `created_at`, `updated_at`: Timestamps

---

### 4. **Cursos Grabados (Catálogo)**
Catálogo de cursos en formato video/clases grabadas.

**Campos:**
- `id`: UUID único
- `name`: Nombre del curso grabado
- `description`: Descripción
- `program_id`: Relación opcional con programa
- `video_url`: URL del video
- `duration_hours`: Duración en horas
- `is_active`: Estado
- `created_at`, `updated_at`: Timestamps

---

### 5. **Registro de Compra de Materiales**
Registro de compras de books y kits por estudiante.

**Campos:**
- `id`: UUID único
- `nombre`: Nombre del material
- `tipo_material`: `book` o `kit`
- `usuario_id`: Usuario que registró la compra
- `estudiante_id`: Estudiante que compra
- `course_id`: Edición asociada
- `estado_pago`: `pendiente`, `pagado`, `cancelado`
- `monto`: Precio del material
- `fecha_registro`, `fecha_pago`: Fechas
- `created_at`, `updated_at`: Timestamps

**Lógica de Negocio:**
- **Books:** Siempre se registran en cada matrícula
- **Kits:** Solo se registran si están incluidos en la matrícula
- El estado de pago determina el **acceso a los resources** en el intranet

---

### 6. **Matrículas**
Registro central de matrículas de estudiantes.

**Campos:**
- `id`: UUID único
- `cod_matricula`: Código único (ej: `MAT-2026-0001`)
- `estudiante_id`: Estudiante matriculado
- `codigo_estudiante`: Código interno del estudiante
- `usuario_id`: Usuario que registró la matrícula
- `modulos_matriculados`: **JSONB** con array de módulos:
  ```json
  [
    {
      "modulo_id": "uuid",
      "nombre": "Fundamentos",
      "code": "PROG001-M1-ENE-2026",
      "course_name": "Programación Básica",
      "start_date": "2026-01-15",
      "end_date": "2026-02-15"
    }
  ]
  ```
- `num_cursos`: Número de ediciones diferentes
- `moneda_monto`: `PEN`, `USD`, `EUR`
- `valor_matricula`: Valor base de los módulos
- `descuento`: Descuento aplicado
- `id_clases_grabadas`: UUID de curso grabado (si aplica)
- `valor_clase_grabada`: Valor de la clase grabada
- `book_incluido`: Boolean
- `kit_incluido`: Boolean
- `precio_final`: **Calculado:** `valor_matricula + valor_clase_grabada - descuento`
- `observaciones`: Notas
- `created_at`, `updated_at`: Timestamps

**Proceso de Matrícula:**
1. Seleccionar estudiante
2. Seleccionar módulos de ediciones
3. Definir valor y descuentos
4. Opcionalmente agregar clases grabadas
5. Indicar si incluye book/kit
6. Opcionalmente registrar pago inicial

---

### 7. **Venta de Cursos Grabados**
Registro de ventas de cursos grabados.

**Campos:**
- `id`: UUID único
- `estudiante_id`: Estudiante comprador
- `usuario_id`: Usuario que registró
- `id_clases_grabadas`: Curso grabado vendido
- `valor_venta`: Precio de venta
- `matricula_id`: Relación opcional con matrícula
- `created_at`, `updated_at`: Timestamps

---

### 8. **Pagos**
Registro de todos los pagos realizados.

**Campos:**
- `id`: UUID único
- `codigo_producto`: Código que identifica el producto:
  - Para matrículas: `cod_matricula` (ej: MAT-2026-0001)
  - Para materiales: `id` del registro de material
  - Para cursos grabados: `id` de venta
- `categoria_producto`: `matricula`, `kits`, `books`, `clases_grabadas`
- `comprobante`: Número de comprobante/recibo
- `monto_pago`: Monto del pago
- `fecha_pago`: Fecha del pago
- `metodo_pago`: `efectivo`, `transferencia`, `tarjeta`, `yape`, `plin`, `otro`
- `moneda_pago`: `PEN`, `USD`, `EUR`
- `estado_pago`: 
  - `primera_cuota`: Pago inicial
  - `pago_regular`: Pago completo
  - `cuotas_restantes`: Cuotas posteriores
- `usuario_id`: Usuario que registró
- `estudiante_id`: Estudiante que paga
- `observaciones`: Notas
- `created_at`, `updated_at`: Timestamps

---

### 9. **Course Enrollments (Inscripciones)**
Inscripciones de estudiantes en módulos específicos.

**Campos:**
- `id`: UUID único
- `modulo_id`: Módulo en el que se inscribe
- `student_id`: Estudiante inscrito
- `matricula_id`: Relación con matrícula
- `tipo_estudiante`: `nuevo` o `antiguo`
- `enrolled_at`: Fecha de inscripción
- `is_active`: Estado activo

**Nota:** Las inscripciones son **por módulo**, no por edición completa.

---

## 🔄 Flujos de Trabajo

### Flujo 1: Creación de Ediciones y Módulos

1. **Administrador crea un Programa** (si no existe)
   - Accede a "Gestión de Programas"
   - Crea programa con código único (ej: PROG001)

2. **Administrador crea una Edición**
   - Accede a "Gestión de Ediciones"
   - Selecciona programa base
   - Define nombre, fechas, profesor, semestre
   - Indica número de módulos y material asociado
   - Se genera código automático: `PROG001-ENE-2026`

3. **Administrador crea Módulos**
   - Accede a la edición creada
   - Crea cada módulo indicando:
     - Nombre y número
     - Fechas de inicio/fin
     - Horario semanal
     - Profesores adicionales
   - Se genera código automático: `PROG001-M1-ENE-2026`

---

### Flujo 2: Registro de Matrícula

1. **Administrador inicia nueva matrícula**
   - Selecciona estudiante
   - Ingresa código de estudiante (opcional)

2. **Selección de módulos**
   - Visualiza ediciones activas
   - Selecciona uno o más módulos de una o varias ediciones

3. **Definición de costos**
   - Ingresa valor base de matrícula
   - Aplica descuentos si corresponde
   - Opcionalmente agrega clases grabadas (con valor)
   - Marca si incluye book y/o kit
   - El sistema calcula automáticamente el precio final

4. **Registro de pago inicial (opcional)**
   - Marca "Registrar pago inicial"
   - Selecciona tipo de pago (primera cuota/pago regular/cuotas restantes)
   - Ingresa monto, método de pago, fecha y comprobante

5. **Confirmación**
   - Se genera código de matrícula: `MAT-2026-0001`
   - Se crean enrollments para cada módulo
   - Se registran materiales (book siempre, kit si aplica)
   - Se registra venta de curso grabado (si aplica)
   - Se registra pago inicial (si aplica)

---

### Flujo 3: Gestión de Pagos

1. **Registro de pagos adicionales**
   - Accede a "Gestión de Pagos"
   - Click en "Registrar Pago"
   - Selecciona categoría (matrícula/kits/books/clases grabadas)
   - Ingresa código del producto
   - Opcionalmente selecciona estudiante
   - Ingresa monto, fecha, método y estado
   - Agrega número de comprobante

2. **Seguimiento de pagos**
   - Filtra por categoría, estado o estudiante
   - Visualiza estadísticas de pagos
   - Exporta reportes

---

## 👨‍🎓 Vistas de Usuario

### Vista de Estudiante

**Modificaciones necesarias:**

1. **Página de Cursos**
   - Muestra las **ediciones** en las que está matriculado
   - Agrupa por ediciones los módulos inscritos

2. **Vista de Edición**
   - Al hacer click en una edición, muestra:
     - Información de la edición
     - Listado de módulos matriculados de esa edición
     - **Recurso principal (Book):** Solo visible si tiene estado "pagado" en `registro_compra_materiales`

3. **Vista de Módulo**
   - Mantiene la estructura actual de semanas y clases
   - Recursos semanales se gestionan por módulo

**Lógica de acceso a Books:**
```typescript
// Verificar si el estudiante tiene acceso al book
const { data: materialAccess } = await supabase
  .from('registro_compra_materiales')
  .select('*')
  .eq('estudiante_id', studentId)
  .eq('course_id', courseId)
  .eq('tipo_material', 'book')
  .eq('estado_pago', 'pagado')
  .single();

if (materialAccess) {
  // Mostrar libro
} else {
  // Ocultar o mostrar mensaje de pago pendiente
}
```

---

### Vista de Profesor

**Modificaciones necesarias:**

1. **Mis Ediciones**
   - Lista ediciones donde es profesor principal
   - Muestra todos los módulos de cada edición

2. **Vista de Módulo**
   - Accede a módulos específicos
   - Ve estudiantes inscritos en el módulo
   - Gestiona recursos semanales
   - Registra asistencias por módulo

---

## 📊 Reportes y Consultas Útiles

### 1. Estudiantes por Módulo
```sql
SELECT 
  m.name as modulo,
  p.first_name,
  p.last_name,
  ce.tipo_estudiante
FROM course_enrollments ce
JOIN modulos m ON ce.modulo_id = m.id
JOIN profiles p ON ce.student_id = p.id
WHERE m.id = 'modulo_uuid';
```

### 2. Pagos Pendientes por Estudiante
```sql
SELECT 
  mat.cod_matricula,
  mat.precio_final,
  COALESCE(SUM(p.monto_pago), 0) as pagado,
  mat.precio_final - COALESCE(SUM(p.monto_pago), 0) as pendiente
FROM matriculas mat
LEFT JOIN pagos p ON p.codigo_producto = mat.cod_matricula
WHERE mat.estudiante_id = 'student_uuid'
GROUP BY mat.id;
```

### 3. Módulos de una Edición
```sql
SELECT * FROM modulos
WHERE course_id = 'course_uuid'
ORDER BY num_modulo;
```

---

## 🔐 Seguridad (RLS)

Todas las tablas tienen habilitado Row Level Security con las siguientes políticas:

- **Estudiantes:** Solo ven sus propias matrículas, pagos e inscripciones
- **Profesores:** Ven ediciones y módulos donde son asignados
- **Administradores:** Acceso completo a todas las tablas
- **Padres:** Ven información de sus hijos

---

## 🚀 Archivos Creados

### Migraciones SQL
- `supabase/migrations/20260127000001_create_peri_institute_model.sql`

### Tipos TypeScript
- `src/integrations/supabase/peri-types.ts`

### Componentes React
- `src/pages/AdminProgramasManagement.tsx` - Gestión de programas
- `src/pages/AdminEdicionesManagement.tsx` - Listado de ediciones
- `src/pages/AdminEdicionForm.tsx` - Crear/editar ediciones
- `src/pages/AdminModulosManagement.tsx` - Gestión de módulos
- `src/pages/AdminMatriculaForm.tsx` - Registro de matrículas
- `src/pages/AdminPagosManagement.tsx` - Gestión de pagos

---

## 📝 Próximos Pasos

1. **Ejecutar la migración SQL** en Supabase
2. **Agregar rutas** en el router de React para los nuevos componentes
3. **Adaptar vistas de estudiante y profesor** según la nueva estructura
4. **Actualizar tablas de recursos semanales** para usar módulos en lugar de courses
5. **Implementar reportes** específicos del negocio
6. **Crear componente de visualización de matrículas** para estudiantes
7. **Implementar sistema de notificaciones** para pagos pendientes

---

## 💡 Consideraciones Importantes

1. **Códigos Auto-generados:** Los códigos de ediciones y módulos se generan automáticamente basándose en el código del programa y la fecha de inicio.

2. **Books siempre se registran:** Cada matrícula registra automáticamente un book en `registro_compra_materiales`, pero el acceso depende del estado de pago.

3. **Kits son opcionales:** Solo se registran si están marcados como incluidos en la matrícula.

4. **Pagos son flexibles:** Permiten primera cuota, pago regular o cuotas restantes, facilitando planes de pago.

5. **Trazabilidad completa:** Cada acción registra el usuario que la realizó para auditoría.

---

## 🆘 Soporte

Para dudas o modificaciones adicionales, contactar al equipo de desarrollo.

**Fecha de implementación:** 27 de enero de 2026
