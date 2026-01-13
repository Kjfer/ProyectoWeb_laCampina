# Confirmación: Email Pre-confirmado para Estudiantes

## ✅ Configuración Verificada

### 1. Edge Function - Registro en Supabase Auth

**Archivo:** `supabase/functions/crud-estudiantes/index.ts`

**Línea 197:**
```typescript
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,  // ✅ EMAIL PRE-CONFIRMADO
  user_metadata: {
    first_name: studentData.first_name,
    last_name: `${studentData.paternal_surname} ${studentData.maternal_surname}`.trim(),
  }
});
```

### 2. Flujo de Creación de Estudiantes

#### Importación Masiva (Excel)
1. Admin carga Excel con columna EMAIL
2. Edge function crea usuario en Supabase Auth con `email_confirm: true`
3. **Resultado:** El estudiante puede iniciar sesión inmediatamente sin verificar email

#### Formulario Individual
1. Admin ingresa email y datos del estudiante
2. Edge function envía datos (ahora con normalización camelCase → snake_case)
3. Se crea usuario con `email_confirm: true`
4. **Resultado:** El estudiante puede iniciar sesión inmediatamente

### 3. Normalización de Datos

**Actualización aplicada:**
```typescript
const normalizedStudents = students.map((student: any) => ({
  first_name: student.first_name || student.firstName,
  paternal_surname: student.paternal_surname || student.paternalSurname,
  maternal_surname: student.maternal_surname || student.maternalSurname,
  // ... etc
}));
```

Ahora la función acepta datos tanto en:
- **snake_case** (desde Excel/importación)
- **camelCase** (desde formulario individual)

## 🔐 Credenciales de Acceso

### Para Estudiantes
- **Email:** El ingresado por el admin (personal o institucional)
- **Contraseña:** Su número de DNI
- **Confirmación:** ✅ NO REQUERIDA (pre-confirmado)

### Primer Inicio de Sesión
1. Estudiante va a la página de login
2. Ingresa su email y DNI como contraseña
3. **Acceso inmediato** - Sin verificación de email
4. Se recomienda cambiar contraseña después del primer acceso

## 🧪 Prueba Rápida

Para verificar que funciona:

1. **Crear estudiante de prueba:**
   - Email: prueba@test.com
   - DNI: 12345678
   - Llenar otros campos requeridos

2. **Verificar en Supabase Dashboard:**
   - Ir a Authentication > Users
   - Buscar el email: prueba@test.com
   - Verificar columna "Email Confirmed": ✅ (debe estar confirmado)

3. **Probar inicio de sesión:**
   - Email: prueba@test.com
   - Contraseña: 12345678
   - Debe entrar sin pedir verificación

## 📋 Checklist de Deployment

- [x] Frontend actualizado (email editable, DNI como contraseña)
- [x] Edge Function con `email_confirm: true`
- [x] Normalización de datos camelCase/snake_case
- [ ] Desplegar Edge Function actualizada
- [ ] Probar creación desde formulario
- [ ] Probar importación masiva
- [ ] Verificar inicio de sesión sin confirmación

## 🚀 Comando para Desplegar

```bash
# Desplegar Edge Function
cd supabase
supabase functions deploy crud-estudiantes
```

## ⚠️ Importante

- **Seguridad:** Aunque el email está pre-confirmado, el DNI como contraseña inicial es temporal
- **Recomendación:** Implementar flujo de "cambio de contraseña obligatorio" en primer inicio de sesión
- **Validación:** El email debe ser válido aunque no requiera confirmación
