# Actualización: Credenciales de Estudiantes

## Cambios Implementados

### 1. Formulario de Nuevo Estudiante

**Antes:**
- Email se generaba automáticamente: `{codigo}@lacampina.edu.pe`
- Contraseña se generaba como: DNI o `Temp{codigo}`

**Ahora:**
- ✅ **Campo de Email editable** - El administrador ingresa el correo del estudiante
- ✅ **DNI como contraseña** - El número de documento se usa como contraseña de acceso
- ✅ **Validación** - Email y DNI son campos requeridos

**Credenciales de acceso:**
```
Email: (el ingresado por el admin)
Contraseña: (el DNI del estudiante)
```

### 2. Importación Masiva desde Excel

**Plantilla actualizada:**
La plantilla Excel ahora incluye la columna `EMAIL`:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| TIPO DE DOCUMENTO | DNI, CE, etc. | DNI |
| NÚMERO DE DOCUMENTO | DNI del estudiante | 12345678 |
| CÓDIGO DEL ESTUDIANTE | Código único | EST001 |
| APELLIDO PATERNO | Apellido paterno | García |
| APELLIDO MATERNO | Apellido materno | López |
| NOMBRES | Nombres completos | Juan Carlos |
| **EMAIL** | **Correo electrónico** | **juan.garcia@correo.com** |
| SEXO | M o F | M |
| FECHA DE NACIMIENTO | YYYY-MM-DD | 2010-05-15 |

**Credenciales generadas:**
- **Email:** El especificado en la columna EMAIL del Excel
- **Contraseña:** El NÚMERO DE DOCUMENTO (DNI)

### 3. Edge Function Actualizada

**Archivo:** `supabase/functions/crud-estudiantes/index.ts`

**Cambios:**
- ✅ Valida que el campo `email` esté presente en los datos
- ✅ Usa el email proporcionado (no lo genera)
- ✅ Usa el DNI como contraseña para crear usuarios en Supabase Auth
- ✅ Mensaje de error si falta el email

## Validaciones

### Formulario Individual
1. Email es requerido y debe ser válido
2. DNI es requerido (se usará como contraseña)
3. Se muestra preview de las credenciales antes de crear

### Importación Masiva
1. Cada fila debe tener EMAIL y NÚMERO DE DOCUMENTO
2. Filas sin email serán rechazadas
3. Se muestra resumen de importación con errores

## Despliegue

### 1. Desplegar cambios del frontend
```bash
git add .
git commit -m "feat: Permitir ingreso de email y usar DNI como contraseña"
git push origin peri-institute-dev
```

### 2. Desplegar Edge Function actualizada
```bash
cd supabase
supabase functions deploy crud-estudiantes
```

## Ejemplos de Uso

### Crear Estudiante Individual
1. Ir a **Gestión de Estudiantes** > **Estudiantes**
2. Clic en **Nuevo Estudiante**
3. Llenar:
   - Código: EST001
   - Email: juan.garcia@gmail.com
   - DNI: 87654321
   - Otros datos...
4. **Credenciales generadas:**
   - Email: juan.garcia@gmail.com
   - Contraseña: 87654321

### Importación Masiva
1. Ir a **Gestión de Estudiantes** > **Importación Masiva**
2. Descargar plantilla (ahora incluye columna EMAIL)
3. Llenar Excel con datos incluyendo emails
4. Importar archivo
5. **Cada estudiante podrá ingresar con:**
   - Email: (el del Excel)
   - Contraseña: (su DNI del Excel)

## Notas Importantes

⚠️ **Seguridad:**
- Los estudiantes deben cambiar su contraseña después del primer inicio de sesión
- El DNI es temporal y fácil de recordar para el primer acceso

✅ **Beneficios:**
- Flexibilidad para usar emails personales o institucionales
- Contraseña inicial conocida (DNI) pero que debe cambiarse
- Validación completa en ambos flujos de creación

## Soporte

Si encuentras algún problema:
1. Verifica que el email sea válido y único
2. Verifica que el DNI tenga el formato correcto
3. Revisa los logs de la Edge Function en Supabase Dashboard
