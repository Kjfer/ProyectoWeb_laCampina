# Módulo de Gestión de Certificados

## Descripción

Este módulo permite a los administradores enviar certificados de cursos a estudiantes mediante integración con n8n (plataforma de automatización).

## Características

### 1. Selección de Curso
- Lista de cursos activos con sus códigos
- Muestra el programa académico asociado al curso
- Solo muestra estudiantes matriculados en el curso seleccionado

### 2. Selección de Estudiantes
- Lista completa de estudiantes matriculados
- Búsqueda por nombre, código de estudiante o email
- Selección individual o masiva
- Vista en tabla con información clara

### 3. Integración con n8n
- Configuración de webhook de n8n
- URL guardada en localStorage para reutilización
- Envío de datos estructurados

## Datos Enviados al Webhook

Para cada estudiante seleccionado, se envía un objeto con:

```json
{
  "certificates": [
    {
      "student_name": "APELLIDO PATERNO APELLIDO MATERNO, NOMBRES",
      "student_email": "estudiante@example.com",
      "course_name": "Nombre del Curso",
      "course_code": "CURSO-001",
      "program_name": "Nombre del Programa",
      "program_code": "PROG-01",
      "academic_year": "2024",
      "semester": "2024-1"
    }
  ],
  "metadata": {
    "sent_by": "admin@example.com",
    "sent_at": "2026-01-20T12:00:00.000Z",
    "total_certificates": 1
  }
}
```

## Configuración del Webhook n8n

### Paso 1: Crear Workflow en n8n

1. Accede a tu instancia de n8n
2. Crea un nuevo workflow
3. Agrega un nodo **Webhook**
4. Configura:
   - **Method**: POST
   - **Path**: `/certificates` (o el que prefieras)
   - **Response Mode**: Immediately

### Paso 2: Procesar los Datos

Ejemplo de configuración en n8n:

```javascript
// Nodo Function para procesar cada certificado
for (const cert of $json.certificates) {
  // Aquí puedes:
  // 1. Generar PDF del certificado
  // 2. Enviar email con el certificado
  // 3. Guardar registro en base de datos
  // 4. Etc.
  
  console.log(`Procesando certificado para: ${cert.student_name}`);
}
```

### Paso 3: Ejemplo de Workflow Completo

```
Webhook → Function (procesar datos) → HTTP Request (generar PDF) → Send Email → Respond
```

## Instalación

### 1. Desplegar Función Edge

```bash
npx supabase functions deploy send-certificates
```

### 2. Verificar Despliegue

```bash
npx supabase functions list
```

## Uso

### Desde la Aplicación

1. **Navega a Certificados**
   - Sidebar → Administración → Certificados

2. **Selecciona un Curso**
   - Elige el curso del dropdown
   - Se cargarán automáticamente los estudiantes matriculados

3. **Configura el Webhook**
   - Ingresa la URL del webhook de n8n
   - Ejemplo: `https://n8n.tudominio.com/webhook/certificates`

4. **Selecciona Estudiantes**
   - Usa la búsqueda para filtrar
   - Selecciona individualmente o usa "Seleccionar todos"
   - Revisa el contador de seleccionados

5. **Enviar Certificados**
   - Haz clic en "Enviar X Certificado(s)"
   - El sistema enviará los datos al webhook
   - Recibirás una notificación de éxito o error

## Archivos del Módulo

### Frontend
- **Página**: `src/pages/AdminCertificates.tsx`
- **Ruta**: `/admin/certificates`
- **Navegación**: `src/utils/roleNavigation.ts`

### Backend
- **Edge Function**: `supabase/functions/send-certificates/index.ts`
- **Endpoint**: `POST /functions/v1/send-certificates`

### Estructura de Tablas Utilizadas

#### courses
```sql
- id (uuid)
- name (text) - Nombre del curso
- code (text) - Código del curso
- program_id (uuid) - FK a programs
- academic_year (text)
- semester (text)
```

#### programs
```sql
- id (uuid)
- name (text) - Nombre del programa
- code (text) - Código del programa
```

#### profiles (estudiantes)
```sql
- id (uuid)
- first_name (text)
- last_name (text)
- paternal_surname (text)
- maternal_surname (text)
- email (text)
- student_code (text)
```

#### course_enrollments
```sql
- id (uuid)
- course_id (uuid) - FK a courses
- student_id (uuid) - FK a profiles
```

## Seguridad

### Validaciones Implementadas

1. **Autenticación**: Solo usuarios autenticados pueden acceder
2. **Autorización**: Solo administradores pueden enviar certificados
3. **Validación de Datos**:
   - Curso debe existir y ser válido
   - Estudiantes deben estar matriculados en el curso
   - Webhook URL es requerida

### Políticas RLS

El módulo respeta las políticas RLS existentes:
- `courses`: Admins pueden ver todos los cursos
- `profiles`: Admins pueden ver todos los perfiles
- `course_enrollments`: Admins pueden ver todas las matrículas

## Logs y Debugging

### Ver Logs de la Función

```bash
npx supabase functions logs send-certificates --project-ref bnbtmubibnupttnnhijr
```

### Logs en Tiempo Real

```bash
npx supabase functions logs send-certificates --project-ref bnbtmubibnupttnnhijr --tail
```

### Mensajes de Log

La función registra:
- ✓ Usuario autenticado
- ✓ Perfil encontrado con rol
- 📜 Cantidad de certificados a enviar
- ✓ Curso encontrado
- ✓ Estudiantes encontrados
- 📤 Envío a webhook
- ✅ Éxito o ❌ Error

## Troubleshooting

### Error: "No hay estudiantes matriculados"
- Verifica que el curso tenga estudiantes en `course_enrollments`
- Verifica que los estudiantes existan en `profiles`

### Error: "Error enviando certificados al webhook"
- Verifica que la URL del webhook sea correcta y accesible
- Verifica que n8n esté ejecutándose
- Revisa los logs del workflow en n8n

### Error 401: "No autorizado"
- Verifica que el usuario tenga rol `admin`
- Verifica que la sesión esté activa

## Mejoras Futuras

- [ ] Historial de certificados enviados
- [ ] Templates personalizables de certificados
- [ ] Preview del certificado antes de enviar
- [ ] Envío programado
- [ ] Notificaciones por email al admin
- [ ] Reintento automático en caso de fallo
- [ ] Estadísticas de certificados enviados
- [ ] Soporte para múltiples webhooks

## Soporte

Para problemas o consultas:
1. Revisa los logs de la función Edge
2. Verifica la configuración del webhook en n8n
3. Consulta la documentación de n8n: https://docs.n8n.io/
