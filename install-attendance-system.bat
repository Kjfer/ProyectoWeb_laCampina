@echo off
REM Script para aplicar los cambios del sistema de asistencia en Windows

echo ==========================================
echo Sistema de Asistencia por Aula Virtual
echo Instalacion de Cambios
echo ==========================================
echo.

REM Paso 1: Aplicar migraciones
echo Paso 1: Aplicando migraciones de base de datos...
echo.
echo Ejecutando: npx supabase db push
call npx supabase db push

if %errorlevel% equ 0 (
    echo Migraciones aplicadas exitosamente
) else (
    echo Error al aplicar migraciones
    echo Intenta aplicar manualmente ejecutando los archivos SQL en este orden:
    echo   1. supabase/migrations/20250924000000_create_classroom_students.sql
    echo   2. supabase/migrations/20250924000001_add_classroom_attendance.sql
    exit /b 1
)

echo.
echo ==========================================

REM Paso 2: Desplegar función Edge
echo Paso 2: Desplegando funcion Edge...
echo.
echo Ejecutando: npx supabase functions deploy create-classroom-attendance
call npx supabase functions deploy create-classroom-attendance

if %errorlevel% equ 0 (
    echo Funcion Edge desplegada exitosamente
) else (
    echo Error al desplegar funcion Edge
    echo Verifica que estes logueado en Supabase CLI
    echo Ejecuta: npx supabase login
    exit /b 1
)

echo.
echo ==========================================
echo Instalacion completada exitosamente!
echo ==========================================
echo.
echo Ahora puedes:
echo 1. Ir a cualquier Aula Virtual
echo 2. Hacer clic en la pestana 'Asistencia'
echo 3. Registrar la asistencia diaria de tus estudiantes
echo.
echo Disfruta del nuevo sistema de asistencia!
pause
