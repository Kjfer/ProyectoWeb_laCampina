# Script para redesplegar funciones Edge con logs mejorados
# Autor: GitHub Copilot
# Fecha: 20 de enero de 2026

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Redeployar Funciones Edge con Logs Mejorados" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar directorio
$projectPath = "c:\periIntranet\ProyectoWeb_laCampina"
if ((Get-Location).Path -ne $projectPath) {
    Set-Location $projectPath
}

Write-Host "Directorio actual: $((Get-Location).Path)" -ForegroundColor Green
Write-Host ""

# Redesplegar funciones Edge
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "REDESPLIEGUE DE FUNCIONES EDGE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Las funciones ahora incluyen logs detallados para diagnosticar errores 401" -ForegroundColor Yellow
Write-Host ""

# Función 1: get-course-class-dates
Write-Host "1. Desplegando get-course-class-dates..." -ForegroundColor Cyan
npx supabase functions deploy get-course-class-dates

if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] get-course-class-dates desplegada correctamente" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Error desplegando get-course-class-dates" -ForegroundColor Red
}
Write-Host ""

# Función 2: toggle-course-access
Write-Host "2. Desplegando toggle-course-access..." -ForegroundColor Cyan
npx supabase functions deploy toggle-course-access

if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] toggle-course-access desplegada correctamente" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Error desplegando toggle-course-access" -ForegroundColor Red
}
Write-Host ""

# Instrucciones de diagnóstico
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PROXIMOS PASOS - DIAGNOSTICO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. VERIFICAR LOGS EN SUPABASE:" -ForegroundColor Yellow
Write-Host "   - Ve a Supabase Dashboard > Edge Functions > Logs" -ForegroundColor White
Write-Host "   - Intenta usar las funciones desde la app" -ForegroundColor White
Write-Host "   - Revisa los nuevos logs detallados para ver donde falla" -ForegroundColor White
Write-Host ""

Write-Host "2. EJECUTAR SCRIPT DE DIAGNOSTICO SQL:" -ForegroundColor Yellow
Write-Host "   - Abre: supabase/diagnostico-rls-401.sql" -ForegroundColor White
Write-Host "   - Ve a Supabase Dashboard > SQL Editor" -ForegroundColor White
Write-Host "   - Ejecuta el script y revisa los resultados" -ForegroundColor White
Write-Host ""

Write-Host "3. BUSCAR EN LOS LOGS:" -ForegroundColor Yellow
Write-Host "   Los logs ahora mostraran:" -ForegroundColor White
Write-Host "   [OK] Usuario autenticado: [user_id] [email]" -ForegroundColor Green
Write-Host "   [OK] Perfil encontrado - ID: [profile_id] Role: [role]" -ForegroundColor Green
Write-Host "   [INFO] Consultando asistencias - course_id: [id] user_role: [role]" -ForegroundColor Cyan
Write-Host "   [ERROR] Error details: [mensaje de error completo]" -ForegroundColor Red
Write-Host ""

Write-Host "4. POSIBLES CAUSAS DEL ERROR 401:" -ForegroundColor Yellow
Write-Host "   a) El usuario no tiene role=admin en la tabla profiles" -ForegroundColor White
Write-Host "   b) Las politicas RLS no se aplicaron correctamente" -ForegroundColor White
Write-Host "   c) Problema con la funcion has_role()" -ForegroundColor White
Write-Host "   d) Token de autenticacion expirado o invalido" -ForegroundColor White
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "COMANDOS UTILES" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ver logs en tiempo real:" -ForegroundColor Yellow
Write-Host "  npx supabase functions logs get-course-class-dates" -ForegroundColor White
Write-Host "  npx supabase functions logs toggle-course-access" -ForegroundColor White
Write-Host ""
Write-Host "Listar funciones desplegadas:" -ForegroundColor Yellow
Write-Host "  npx supabase functions list" -ForegroundColor White
Write-Host ""
