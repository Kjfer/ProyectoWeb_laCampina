# Sistema de Comprobantes de Pago con Archivos

## Cambios Realizados

Se ha modificado el sistema de registro de pagos para permitir la carga de archivos de comprobantes (imágenes o PDFs) en lugar de solo ingresar el número de comprobante.

### Características Implementadas

1. **Campo de Carga de Archivos**
   - Reemplaza el campo de texto "Número de Comprobante" 
   - Acepta archivos de imagen (JPG, PNG, etc.) y PDF
   - Muestra el nombre del archivo seleccionado
   - Indica visualmente cuando está subiendo el archivo

2. **Almacenamiento en Supabase Storage**
   - Los archivos se guardan en el bucket `payment-receipts`
   - Estructura de carpetas: `{estudiante_id}/{timestamp}_{estudiante_id}_{codigo_producto}.{ext}`
   - El bucket es público para facilitar la visualización
   - La URL pública se guarda en el campo `comprobante` de la tabla `pagos`

3. **Visualización en la Tabla**
   - En lugar de mostrar el texto del comprobante, se muestra un enlace "Ver comprobante"
   - Al hacer clic, se abre el archivo en una nueva pestaña
   - Incluye un ícono de archivo para mejor UX
   - Si no hay comprobante, muestra "-"

4. **Seguridad y Permisos**
   - Políticas RLS configuradas para el bucket
   - Usuarios autenticados pueden subir sus propios comprobantes
   - Admins y directivos pueden subir, actualizar y eliminar comprobantes de cualquier estudiante
   - Todos los usuarios autenticados pueden ver los comprobantes

## Configuración del Bucket de Storage

### Opción 1: Migración Automática
Si usas migraciones de Supabase, el bucket se creará automáticamente con:
```bash
supabase db push
```

### Opción 2: Configuración Manual
Ejecuta el archivo `supabase/setup_payment_receipts_bucket.sql` en el SQL Editor de Supabase:

1. Ir a Supabase Dashboard
2. Navegar a SQL Editor
3. Copiar y pegar el contenido de `setup_payment_receipts_bucket.sql`
4. Ejecutar el script

### Verificación
Para verificar que el bucket se creó correctamente:
1. Ir a Storage en Supabase Dashboard
2. Deberías ver el bucket `payment-receipts`
3. Verificar que las políticas estén activas

## Archivos Modificados

- `src/pages/AdminPagosManagement.tsx`: 
  - Agregado estado `comprobanteFile` y `uploadingComprobante`
  - Modificada función `handleSubmit` para subir archivo antes de guardar pago
  - Actualizado campo del formulario a tipo `file`
  - Mejorada visualización en tabla con enlace y ícono

## Archivos Creados

- `supabase/migrations/20260219000000_create_payment_receipts_bucket.sql`: Migración para crear bucket
- `supabase/setup_payment_receipts_bucket.sql`: Script manual para configurar bucket
- `COMPROBANTES_PAGO_README.md`: Esta documentación

## Uso

### Registrar un Pago con Comprobante

1. Hacer clic en "Registrar Pago"
2. Llenar todos los campos obligatorios
3. En "Archivo de Comprobante", hacer clic en "Elegir archivo"
4. Seleccionar imagen o PDF del comprobante
5. El nombre del archivo seleccionado aparecerá debajo
6. Hacer clic en "Registrar Pago"
7. El sistema subirá el archivo automáticamente

### Ver Comprobantes

1. En la tabla de pagos, buscar la columna "Comprobante"
2. Si hay comprobante, aparecerá el enlace "Ver comprobante" con un ícono
3. Hacer clic para abrir el archivo en nueva pestaña

## Notas Técnicas

- Los archivos mantienen su extensión original
- El nombre se genera automáticamente con timestamp para evitar colisiones
- Los archivos se organizan por carpetas de estudiante para mejor organización
- El campo `comprobante` sigue siendo opcional
- Compatible con el sistema de filtrado existente

## Próximas Mejoras Sugeridas

- [ ] Agregar límite de tamaño de archivo (ej: 5MB máximo)
- [ ] Previsualización de imagen antes de subir
- [ ] Capacidad de reemplazar comprobante existente
- [ ] Miniatura de vista previa en la tabla
- [ ] Descarga directa además de visualización
- [ ] Validación de formato de archivo en backend
