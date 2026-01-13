# Módulo de Matriculación de Estudiantes Existentes

## Descripción General

Este módulo permite a los administradores matricular estudiantes ya registrados en el sistema a nuevos cursos. A diferencia del módulo de importación masiva, este no crea nuevos usuarios, sino que simplemente agrega estudiantes existentes a cursos adicionales.

## Características

### 🎯 Funcionalidades Principales

1. **Selección de Curso Destino**
   - Lista desplegable con todos los cursos activos
   - Muestra código del curso, nombre, grado y sección
   - Filtrado por año académico

2. **Búsqueda de Estudiantes**
   - Búsqueda por nombre completo
   - Búsqueda por código de estudiante
   - Búsqueda por DNI
   - Búsqueda en tiempo real (sin necesidad de presionar botón)

3. **Filtros Avanzados**
   - Mostrar solo estudiantes no matriculados en el curso seleccionado
   - Filtrado automático al cambiar de curso

4. **Selección Múltiple**
   - Selección individual mediante checkbox
   - Botón "Seleccionar todos" para marcar todos los estudiantes visibles
   - Botón "Limpiar" para deseleccionar todos
   - Contador de estudiantes seleccionados

5. **Visualización de Estudiantes**
   - Lista con scroll para ver muchos estudiantes
   - Información completa: apellidos, nombres, código, DNI, sexo
   - Estado visual: Activo/Inactivo
   - Resaltado visual de estudiantes seleccionados

6. **Matriculación Masiva**
   - Verificación automática de estudiantes ya matriculados
   - Evita duplicados automáticamente
   - Mensaje informativo si algunos estudiantes ya están matriculados
   - Confirmación visual con cantidad de estudiantes matriculados

## Estructura de Archivos

```
src/
├── pages/
│   └── AdminEnrollExistingStudents.tsx    # Página principal del módulo
├── utils/
│   └── roleNavigation.ts                   # Navegación (incluye nueva ruta)
└── App.tsx                                 # Rutas (incluye /admin/enroll-existing)
```

## Flujo de Trabajo

### Paso 1: Acceder al Módulo
1. Iniciar sesión como administrador
2. Ir al menú lateral
3. Seleccionar "Matricular Existentes"

### Paso 2: Seleccionar Curso
1. Abrir el selector de curso destino
2. Elegir el curso donde deseas matricular estudiantes
3. El sistema cargará automáticamente la lista de estudiantes

### Paso 3: Buscar y Filtrar
1. (Opcional) Usar la barra de búsqueda para encontrar estudiantes específicos
2. (Opcional) Activar "Solo no matriculados" para ver únicamente estudiantes no inscritos en ese curso
3. Ver el contador de estudiantes encontrados

### Paso 4: Seleccionar Estudiantes
1. Hacer clic en los estudiantes que deseas matricular (o en sus checkboxes)
2. Usar "Seleccionar todos" si deseas matricular a todos los visibles
3. Ver el contador de estudiantes seleccionados actualizado

### Paso 5: Matricular
1. Revisar el resumen en la tarjeta inferior (cantidad y curso destino)
2. Hacer clic en "Matricular Ahora"
3. Esperar confirmación del sistema
4. La selección se limpiará automáticamente tras matricular

## Validaciones Automáticas

### Pre-Matriculación
- ✅ Verificar que se haya seleccionado un curso
- ✅ Verificar que se haya seleccionado al menos un estudiante
- ✅ Verificar que los estudiantes no estén ya matriculados

### Durante Matriculación
- ✅ Consultar matriculaciones existentes
- ✅ Filtrar estudiantes ya matriculados
- ✅ Crear solo las matriculaciones necesarias

### Post-Matriculación
- ✅ Confirmar cantidad de estudiantes matriculados
- ✅ Informar sobre estudiantes que ya estaban matriculados
- ✅ Actualizar la vista automáticamente

## Casos de Uso

### Caso 1: Matricular Estudiantes Nuevos en Curso de Recuperación
**Escenario:** Necesitas matricular 10 estudiantes en un curso de recuperación de matemáticas

1. Seleccionar "Curso de Recuperación - MAT101"
2. Activar filtro "Solo no matriculados"
3. Buscar por nombres o códigos de los 10 estudiantes
4. Seleccionar uno por uno
5. Matricular

### Caso 2: Trasladar Toda una Sección a Nuevo Curso
**Escenario:** Todos los estudiantes de 5to A deben cursar un nuevo electivo

1. Seleccionar el curso electivo destino
2. Buscar "5to A" o filtrar por grado
3. Usar "Seleccionar todos"
4. Matricular

### Caso 3: Corregir Estudiante Faltante
**Escenario:** Un estudiante fue olvidado en la matrícula inicial

1. Seleccionar el curso correspondiente
2. Buscar al estudiante por nombre o DNI
3. Seleccionar solo ese estudiante
4. Matricular

## Permisos

- **Acceso:** Solo rol `admin`
- **Operaciones:** 
  - Lectura de `courses` (cursos activos)
  - Lectura de `profiles` (estudiantes activos)
  - Lectura de `course_enrollments` (para verificar duplicados)
  - Escritura en `course_enrollments` (para matricular)

## Interfaz de Usuario

### Componentes Visuales

1. **Título y Descripción**
   - Encabezado claro del módulo
   - Instrucciones breves

2. **Tarjeta de Selección de Curso**
   - Icono de libro
   - Selector dropdown
   - Descripción de la acción

3. **Tarjeta de Búsqueda y Filtros**
   - Icono de usuarios
   - Campo de búsqueda con icono de lupa
   - Checkbox para filtro de no matriculados
   - Contador de resultados y seleccionados
   - Botones de acción (Limpiar, Seleccionar todos)

4. **Tarjeta de Lista de Estudiantes**
   - Scroll vertical para listas largas
   - Cada estudiante en tarjeta individual
   - Checkbox para selección
   - Información completa del estudiante
   - Badge de estado (Activo/Inactivo)
   - Hover y estados visuales

5. **Tarjeta de Acción**
   - Solo visible cuando hay estudiantes seleccionados
   - Resumen de la acción a realizar
   - Botón principal destacado
   - Indicador de carga durante matriculación

## Mensajes del Sistema

### Éxito
```
✅ 15 estudiantes matriculados exitosamente
✅ 10 estudiantes matriculados exitosamente (5 ya estaban matriculados)
```

### Error
```
❌ Debes seleccionar un curso
❌ Debes seleccionar al menos un estudiante
❌ No se pudieron matricular los estudiantes
```

### Información
```
ℹ️ Todos los estudiantes seleccionados ya están matriculados en este curso
```

## Diferencias con Importación Masiva

| Característica | Importación Masiva | Matriculación Existentes |
|---------------|-------------------|------------------------|
| Crea usuarios | ✅ Sí | ❌ No |
| Crea perfiles | ✅ Sí | ❌ No |
| Matricula en cursos | ✅ Sí | ✅ Sí |
| Fuente de datos | Archivo Excel | Base de datos |
| Selección | Archivo completo | Individual/múltiple |
| Búsqueda | ❌ No | ✅ Sí |
| Filtros | ❌ No | ✅ Sí |
| Uso típico | Inicio de año | Durante el año |

## Consultas a la Base de Datos

### Cargar Cursos
```sql
SELECT * FROM courses 
WHERE is_active = true 
ORDER BY academic_year DESC, name ASC
```

### Cargar Estudiantes
```sql
SELECT * FROM profiles 
WHERE role = 'student' AND is_active = true 
ORDER BY paternal_surname ASC
```

### Verificar Matriculaciones Existentes
```sql
SELECT student_id FROM course_enrollments 
WHERE course_id = ? AND student_id IN (?)
```

### Crear Matriculaciones
```sql
INSERT INTO course_enrollments (student_id, course_id, enrolled_at) 
VALUES (?, ?, NOW())
```

## Mantenimiento

### Agregar Nuevos Filtros
Para agregar un filtro adicional (ej: por género):

1. Agregar estado en el componente:
```typescript
const [filterGender, setFilterGender] = useState<string>('all');
```

2. Agregar selector en la UI
3. Modificar la función `filterStudentsList`:
```typescript
if (filterGender !== 'all') {
  filtered = filtered.filter(s => s.gender === filterGender);
}
```

### Optimización para Muchos Estudiantes
Si la institución tiene > 1000 estudiantes:

1. Implementar paginación en lugar de scroll infinito
2. Mover el filtrado al servidor (Supabase query)
3. Agregar índices en `profiles.student_code` y `profiles.document_number`

## Troubleshooting

### Problema: Los cursos no se cargan
**Solución:** Verificar que existan cursos con `is_active = true`

### Problema: No aparecen estudiantes
**Solución:** Verificar que existan perfiles con `role = 'student'` y `is_active = true`

### Problema: Error al matricular
**Solución:** 
1. Verificar permisos RLS en `course_enrollments`
2. Revisar logs del navegador (F12)
3. Verificar que el usuario admin tenga los permisos correctos

### Problema: Estudiantes duplicados en la lista
**Solución:** Esto no debería ocurrir ya que usamos `student_id` único, pero verificar que no haya perfiles duplicados en la tabla `profiles`

## Próximas Mejoras

- [ ] Exportar lista de estudiantes matriculados a Excel
- [ ] Desmatricular estudiantes desde la misma vista
- [ ] Vista de historial de matriculaciones
- [ ] Notificaciones a padres/estudiantes al matricular
- [ ] Validación de requisitos del curso antes de matricular
- [ ] Límite de estudiantes por curso
- [ ] Matriculación con fecha de inicio personalizada

## Soporte

Para problemas o dudas sobre este módulo, contactar al equipo de desarrollo o revisar la documentación técnica en `/docs`.
