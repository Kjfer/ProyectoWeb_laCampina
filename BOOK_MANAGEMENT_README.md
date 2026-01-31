# Gestión de Books del Curso

## Descripción

Esta funcionalidad permite a los administradores gestionar los "books" (materiales de estudio en PDF) para los cursos. Los books solo están disponibles en el **Módulo 1** de cada edición.

## Características Implementadas

### 1. **Estructura de Datos**

- El campo `book_url` en la tabla `courses` almacena la URL del archivo PDF del book
- La tabla `registro_compra_materiales` controla qué estudiantes han comprado el book y su estado de pago
- Los archivos se almacenan en el bucket `course-books` con la estructura: `{course_id}/book.pdf`

### 2. **Permisos y Accesos**

#### Administradores
- Pueden subir, actualizar y eliminar books
- Acceso completo desde el formulario de edición de cursos
- Pueden gestionar directamente desde el Módulo 1

#### Profesores
- Pueden descargar todos los books
- Acceso de solo lectura
- No requieren compra para visualizar

#### Estudiantes
- Solo pueden descargar books que hayan comprado (`tipo_material = 'book'`)
- El estado de pago debe ser `'pagado'` en la tabla `registro_compra_materiales`
- Si no han comprado, ven un mensaje indicándoles que deben adquirir el book

### 3. **Componentes Creados**

#### `ModuloBookSection.tsx`
Componente ubicado en `src/components/course/ModuloBookSection.tsx`

**Funcionalidades:**
- **Para Admin**: 
  - Subir nuevo book (PDF)
  - Eliminar book existente
  - Descargar book
  
- **Para Profesores**:
  - Descargar book
  
- **Para Estudiantes**:
  - Descargar book (solo si lo compraron)
  - Ver mensaje de "acceso bloqueado" si no lo compraron

**Props:**
```typescript
interface ModuloBookSectionProps {
  courseId: string;  // ID de la edición (course)
  canEdit: boolean;  // true solo para admin
}
```

#### Integración en `WeeklyContentManager.tsx`

El componente se muestra automáticamente en el Módulo 1, antes del contenido semanal:

```tsx
{moduloInfo?.num_modulo === 1 && moduloInfo?.course_id && (
  <ModuloBookSection
    courseId={moduloInfo.course_id}
    canEdit={canEdit}
  />
)}
```

### 4. **Formulario de Edición Actualizado**

#### `AdminEdicionForm.tsx`

Se actualizó para incluir la carga de books:

- Campo de selección de archivo PDF cuando `material = 'book'`
- Upload automático al bucket `course-books/{course_id}/book.pdf`
- Actualización del campo `book_url` en la tabla `courses`

**Flujo de creación:**
1. Admin crea la edición
2. Si selecciona material tipo "book" y sube un archivo
3. Primero se crea la edición en la BD
4. Luego se sube el archivo usando el `course_id` generado
5. Finalmente se actualiza el `book_url`

**Flujo de edición:**
1. Admin puede cambiar el book existente
2. El archivo anterior se sobrescribe automáticamente
3. Se actualiza el `book_url` en la BD

### 5. **Políticas de Seguridad (RLS)**

#### Storage Bucket `course-books`

**Políticas implementadas:**

1. **Administradores** - INSERT, UPDATE, DELETE
   - Pueden gestionar todos los archivos

2. **Profesores** - SELECT
   - Pueden descargar todos los books

3. **Estudiantes** - SELECT (condicional)
   - Solo pueden descargar books de ediciones donde:
     - Tienen un registro en `registro_compra_materiales`
     - Con `tipo_material = 'book'`
     - Con `estado_pago = 'pagado'`
     - Donde `course_id` coincide con el de la edición

## Migración de Base de Datos

Archivo: `supabase/migrations/20260131000001_create_modulo_books_table.sql`

Incluye:
- Creación del bucket `course-books`
- Políticas de seguridad RLS para storage
- Configuración de permisos por rol

**Para aplicar la migración:**
```bash
# Si usas Supabase CLI local
supabase db push

# O ejecuta manualmente el SQL en el dashboard de Supabase
```

## Flujo de Uso

### Como Administrador

1. Ir a **Admin → Gestión de Cursos → Ediciones**
2. Crear o editar una edición
3. Seleccionar "Libro" en el campo "Material Asociado"
4. Subir un archivo PDF usando el campo "Archivo del Libro"
5. Guardar la edición
6. El book estará disponible en el Módulo 1

Alternativamente:
1. Ir directamente al Módulo 1 de cualquier edición
2. Usar la sección "Book del Curso" para subir/eliminar el archivo

### Como Profesor

1. Ir a cualquier Módulo 1
2. Si hay un book disponible, aparecerá la sección "Book del Curso"
3. Click en "Descargar" para obtener el PDF

### Como Estudiante

1. Comprar el book (registrado por administración en `registro_compra_materiales`)
2. El estado de pago debe cambiar a "pagado"
3. Ir al Módulo 1 del curso
4. Si tiene acceso, verá el botón "Descargar"
5. Si no tiene acceso, verá un mensaje indicando que debe adquirir el book

## Verificación de Permisos

### Query para verificar acceso de un estudiante

```sql
SELECT 
  rcm.id,
  rcm.estado_pago,
  rcm.tipo_material,
  p.first_name,
  p.last_name,
  c.name as course_name
FROM registro_compra_materiales rcm
JOIN profiles p ON p.id = rcm.estudiante_id
JOIN courses c ON c.id = rcm.course_id
WHERE rcm.estudiante_id = 'STUDENT_UUID'
  AND rcm.tipo_material = 'book'
  AND rcm.estado_pago = 'pagado';
```

## Notas Técnicas

- Los archivos se almacenan con la estructura: `{course_id}/book.pdf`
- Al subir un nuevo book, el anterior se sobrescribe automáticamente (upsert: true)
- El componente solo se muestra en módulos con `num_modulo = 1`
- La verificación de permisos se hace en tiempo real consultando `registro_compra_materiales`
- El bucket es privado (`public: false`), por lo que todas las descargas pasan por las políticas RLS

## Archivos Modificados

1. `supabase/migrations/20260131000001_create_modulo_books_table.sql` ✅ NUEVO
2. `src/components/course/ModuloBookSection.tsx` ✅ NUEVO
3. `src/components/course/WeeklyContentManager.tsx` ✅ MODIFICADO
4. `src/pages/AdminEdicionForm.tsx` ✅ MODIFICADO

## Testing

Para probar la funcionalidad:

1. **Como Admin:**
   - Crear una nueva edición con material tipo "book"
   - Subir un PDF
   - Verificar que aparece en el Módulo 1

2. **Como Profesor:**
   - Acceder al Módulo 1
   - Verificar que puede descargar el book

3. **Como Estudiante SIN compra:**
   - Acceder al Módulo 1
   - Verificar que ve el mensaje de "acceso bloqueado"

4. **Como Estudiante CON compra:**
   - Registrar una compra en `registro_compra_materiales`
   - Marcar como `estado_pago = 'pagado'`
   - Verificar que puede descargar el book

## Mantenimiento

- Los books se almacenan indefinidamente a menos que el admin los elimine
- Si se elimina una edición, el book asociado permanece en storage (considerar cleanup manual)
- El tamaño máximo de archivo depende de la configuración de Supabase Storage
