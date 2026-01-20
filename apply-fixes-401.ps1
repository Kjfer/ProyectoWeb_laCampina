# Script para aplicar las correcciones de errores 401
# Autor: GitHub Copilot
# Fecha: 20 de enero de 2026

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Aplicando correcciones de errores 401" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar que estamos en el directorio correcto
$projectPath = "c:\periIntranet\ProyectoWeb_laCampina"
if ((Get-Location).Path -ne $projectPath) {
    Write-Host "Cambiando al directorio del proyecto..." -ForegroundColor Yellow
    Set-Location $projectPath
}

Write-Host "Directorio actual: $((Get-Location).Path)" -ForegroundColor Green
Write-Host ""

# Paso 2: Aplicar migración de base de datos
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PASO 1: Aplicar migración de políticas RLS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "La migración agregará políticas RLS para que administradores" -ForegroundColor Yellow
Write-Host "puedan acceder a los registros de asistencia." -ForegroundColor Yellow
Write-Host ""

$applyMigration = Read-Host "¿Aplicar migración en base de datos? (S/N)"
if ($applyMigration -eq 'S' -or $applyMigration -eq 's') {
    Write-Host "Aplicando migración con Supabase CLI..." -ForegroundColor Green
    npx supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migración aplicada correctamente" -ForegroundColor Green
    } else {
        Write-Host "✗ Error al aplicar la migración" -ForegroundColor Red
        Write-Host "Puedes aplicarla manualmente en Supabase Dashboard:" -ForegroundColor Yellow
        Write-Host "  1. Ve a SQL Editor" -ForegroundColor Yellow
        Write-Host "  2. Ejecuta: supabase/migrations/20260120000000_add_admin_attendance_policy.sql" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Migración omitida - Deberás aplicarla manualmente" -ForegroundColor Yellow
}
Write-Host ""

# Paso 3: Redesplegar función Edge
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PASO 2: Redesplegar función toggle-course-access" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Esta función corrige el error en la gestión de pagos" -ForegroundColor Yellow
Write-Host "al cambiar el nombre de tabla de 'enrollments' a 'course_enrollments'" -ForegroundColor Yellow
Write-Host ""

$deployFunction = Read-Host "¿Redesplegar función Edge? (S/N)"
if ($deployFunction -eq 'S' -or $deployFunction -eq 's') {
    Write-Host "Desplegando función toggle-course-access..." -ForegroundColor Green
    npx supabase functions deploy toggle-course-access
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Función desplegada correctamente" -ForegroundColor Green
    } else {
        Write-Host "✗ Error al desplegar la función" -ForegroundColor Red
        Write-Host "Puede que necesites iniciar sesión:" -ForegroundColor Yellow
        Write-Host "  npx supabase login" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Despliegue omitido - Deberás hacerlo manualmente con:" -ForegroundColor Yellow
    Write-Host "  npx supabase functions deploy toggle-course-access" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Correcciones aplicadas:" -ForegroundColor Green
Write-Host "  ✓ Código de toggle-course-access actualizado" -ForegroundColor Green
if ($applyMigration -eq 'S' -or $applyMigration -eq 's') {
    Write-Host "  ✓ Migración de RLS aplicada" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Migración de RLS pendiente" -ForegroundColor Yellow
}
if ($deployFunction -eq 'S' -or $deployFunction -eq 's') {
    Write-Host "  ✓ Función Edge desplegada" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Función Edge pendiente de despliegue" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Próximos pasos para verificar:" -ForegroundColor Cyan
Write-Host "  1. Inicia sesión como administrador" -ForegroundColor White
Write-Host "  2. Ve a Reporte de Asistencia y selecciona un curso" -ForegroundColor White
Write-Host "  3. Ve a Gestión de Estudiantes y cambia un estado de pago" -ForegroundColor White
Write-Host "  4. Verifica que no aparezcan errores 401" -ForegroundColor White
Write-Host ""

Write-Host "Para más información, consulta:" -ForegroundColor Cyan
Write-Host "  ATTENDANCE_ADMIN_FIX.md" -ForegroundColor White
Write-Host ""
