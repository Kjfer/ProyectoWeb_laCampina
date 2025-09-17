# Configuración de la Base de Datos Supabase

Para conectar Django a tu base de datos de Supabase existente, necesitas obtener la cadena de conexión PostgreSQL.

## Pasos para obtener la cadena de conexión:

1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard)
2. Navega a **Settings** > **Database**
3. En la sección **Connection info**, encontrarás:
   - Host: `db.dvucxenjdfxxqtekhqfg.supabase.co`
   - Database name: `postgres`
   - Port: `5432`
   - User: `postgres`
   - Password: [TU_PASSWORD_DE_SUPABASE]

## Actualizar el archivo .env:

Reemplaza `[PASSWORD]` en el archivo `.env` con tu contraseña real de Supabase:

```
DATABASE_URL=postgresql://postgres:[TU_PASSWORD_AQUI]@db.dvucxenjdfxxqtekhqfg.supabase.co:5432/postgres
```

## Importante:

- **NO** ejecutes migraciones de Django (`makemigrations` o `migrate`) inicialmente
- Django usará las tablas existentes de Supabase
- Los modelos están configurados para mapear directamente a las tablas existentes
- La autenticación se manejará a través de Django, pero respetando la estructura de Supabase

## Próximos pasos:

1. Actualizar `.env` con la contraseña correcta
2. Probar la conexión: `python manage.py dbshell`
3. Crear APIs sin alterar el esquema existente
4. Migrar gradualmente desde el cliente Supabase al API de Django

## Estructura de tablas existentes que Django usará:

- `profiles` - Perfiles de usuario con roles
- `courses` - Cursos académicos
- `course_enrollments` - Inscripciones a cursos
- `assignments` - Asignaciones/tareas
- `assignment_submissions` - Entregas de tareas
- `attendance` - Registro de asistencia
- `announcements` - Anuncios del sistema