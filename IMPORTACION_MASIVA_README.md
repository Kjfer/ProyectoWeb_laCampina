# Módulo de Importación Masiva de Estudiantes

## Descripción
Este módulo permite registrar estudiantes nuevos en lote a través de un archivo Excel y matricularlos automáticamente en un curso específico.

## Características

### Para Estudiantes Nuevos
- ✅ Carga masiva mediante archivo Excel
- ✅ Registro automático de usuarios en el sistema
- ✅ Creación de perfiles completos con todos los campos
- ✅ Matrícula automática al curso seleccionado
- ✅ Validación de duplicados por DNI y código de estudiante
- ✅ Actualización de datos si el estudiante ya existe

### Campos del Estudiante
El archivo Excel debe contener las siguientes columnas:

| Columna | Descripción | Requerido | Ejemplo |
|---------|-------------|-----------|---------|
| TIPO DE DOCUMENTO | DNI, CE, Pasaporte, etc | Sí | DNI |
| NÚMERO DE DOCUMENTO | Número del documento | Sí | 12345678 |
| CÓDIGO DEL ESTUDIANTE | Código único del estudiante | Sí | EST001 |
| APELLIDO PATERNO | Apellido paterno | Sí | García |
| APELLIDO MATERNO | Apellido materno | Sí | López |
| NOMBRES | Nombres completos | Sí | Juan Carlos |
| SEXO | M (Masculino), F (Femenino) | Sí | M |
| FECHA DE NACIMIENTO | Formato: YYYY-MM-DD | Sí | 2010-05-15 |

### Nuevas Columnas en Profiles
Se han agregado las siguientes columnas a la tabla `profiles`:

- **country** (TEXT): País de origen del estudiante (default: 'Perú')
- **education_level** (TEXT): Nivel educativo (primaria, secundaria, superior, etc.)
- **gender** (TEXT): Género (M, F, Otro) - ya existía, se agregó índice

## Uso del Módulo

### 1. Acceder al Módulo
- Navegar a: Admin → Importación Masiva (`/admin/bulk-import`)
- Solo accesible para usuarios con rol de administrador

### 2. Seleccionar Curso
- El sistema mostrará todos los cursos activos
- Hacer clic en el curso donde desea matricular a los estudiantes
- Se mostrará información del curso y cantidad de estudiantes actuales

### 3. Descargar Plantilla
- Hacer clic en "Descargar Plantilla Excel"
- Se descargará un archivo `plantilla_estudiantes.xlsx` con el formato correcto

### 4. Llenar Plantilla
- Completar todos los campos requeridos
- Asegurarse de que los códigos de estudiante sean únicos
- Verificar que los documentos de identidad sean correctos

### 5. Importar Archivo
- Arrastrar el archivo Excel o hacer clic para seleccionarlo
- El sistema procesará el archivo automáticamente
- Se mostrará una vista previa con los estudiantes encontrados

### 6. Confirmar Importación
- Revisar los datos de los estudiantes
- Hacer clic en "Iniciar Importación"
- Observar el log de progreso en tiempo real

### 7. Resultados
El sistema mostrará:
- Cantidad de estudiantes nuevos creados
- Cantidad de estudiantes existentes actualizados
- Cantidad de errores (si los hubiera)
- Detalles de cada operación en el log

## Proceso de Importación

### Para Estudiantes Nuevos
1. Se crea un usuario en Auth con email: `{codigo_estudiante}@estudiante.edu.pe`
2. Contraseña temporal: número de documento
3. Se crea el perfil en la tabla `profiles` con rol 'student'
4. Se matricula automáticamente en el curso seleccionado
5. Se envía confirmación por email (opcional)

### Para Estudiantes Existentes
1. Se busca por número de documento o código de estudiante
2. Se actualizan todos los campos con la información del Excel
3. Si no está matriculado en el curso, se matricula automáticamente
4. Si ya está matriculado, solo se actualizan sus datos

## Migración de Base de Datos

Para agregar las nuevas columnas a la tabla `profiles`, ejecutar:

```bash
cd supabase
supabase db push
```

O aplicar manualmente el archivo:
```
supabase/migrations/add_profiles_columns.sql
```

## API Edge Function

La función `crud-estudiantes` maneja:
- POST con array de estudiantes para importación masiva
- Validación de duplicados
- Creación de usuarios en Auth
- Actualización de perfiles existentes
- Matriculación en curso

### Endpoint
```
POST /functions/v1/crud-estudiantes
```

### Body
```json
{
  "students": [
    {
      "document_type": "DNI",
      "document_number": "12345678",
      "student_code": "EST001",
      "paternal_surname": "García",
      "maternal_surname": "López",
      "first_name": "Juan Carlos",
      "gender": "M",
      "birth_date": "2010-05-15"
    }
  ],
  "courseId": "uuid-del-curso",
  "courseName": "Matemáticas",
  "courseCode": "MAT101"
}
```

### Response
```json
{
  "success": true,
  "message": "Procesados: 10 estudiantes (8 nuevos, 2 existentes), 0 errores",
  "summary": {
    "total": 10,
    "new": 8,
    "existing": 2,
    "errors": 0
  },
  "results": {
    "success": [...],
    "errors": [...]
  }
}
```

## Validaciones

### El sistema valida:
- ✅ Formato del archivo Excel
- ✅ Campos requeridos completos
- ✅ Formato de fechas correcto
- ✅ Códigos de estudiante únicos
- ✅ Números de documento únicos
- ✅ Existencia del curso seleccionado

### Manejo de Errores
- Si un estudiante falla, se registra el error pero continúa con los demás
- Se muestra un log detallado de cada operación
- Se indica claramente qué estudiantes fueron procesados y cuáles fallaron

## Notas Importantes

1. **Credenciales por Defecto**:
   - Email: `{codigo_estudiante}@estudiante.edu.pe`
   - Password: número de documento del estudiante

2. **Actualización de Datos**:
   - Si el estudiante ya existe (por DNI o código), se actualizan sus datos
   - La matriculación es idempotente (no crea duplicados)

3. **Rendimiento**:
   - La importación procesa estudiantes de forma secuencial
   - Para lotes grandes (>100), puede tomar varios segundos

4. **Seguridad**:
   - Solo administradores pueden acceder al módulo
   - Se usa Service Role Key para operaciones de Auth
   - Se validan todos los datos antes de procesar

## Estudiantes Antiguos

Para registrar estudiantes antiguos (que ya existen en el sistema pero necesitan ser matriculados en nuevos cursos), se debe crear una vista separada con la siguiente lógica:

- Buscar estudiantes existentes por DNI o código
- Mostrar listado de estudiantes disponibles
- Permitir selección múltiple
- Matricular en el curso seleccionado
- No crear usuarios nuevos
- Solo actualizar matriculaciones

Esta funcionalidad se implementará en un módulo separado para mantener clara la distinción entre estudiantes nuevos y antiguos.
