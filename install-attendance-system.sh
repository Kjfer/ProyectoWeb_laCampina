#!/bin/bash

# Script para aplicar los cambios del sistema de asistencia

echo "=========================================="
echo "Sistema de Asistencia por Aula Virtual"
echo "Instalación de Cambios"
echo "=========================================="
echo ""

# Paso 1: Aplicar migraciones
echo "Paso 1: Aplicando migraciones de base de datos..."
echo ""
echo "Ejecutando: npx supabase db push"
npx supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migraciones aplicadas exitosamente"
else
    echo "❌ Error al aplicar migraciones"
    echo "Intenta aplicar manualmente ejecutando los archivos SQL en este orden:"
    echo "  1. supabase/migrations/20250924000000_create_classroom_students.sql"
    echo "  2. supabase/migrations/20250924000001_add_classroom_attendance.sql"
    exit 1
fi

echo ""
echo "=========================================="

# Paso 2: Desplegar función Edge
echo "Paso 2: Desplegando función Edge..."
echo ""
echo "Ejecutando: npx supabase functions deploy create-classroom-attendance"
npx supabase functions deploy create-classroom-attendance

if [ $? -eq 0 ]; then
    echo "✅ Función Edge desplegada exitosamente"
else
    echo "❌ Error al desplegar función Edge"
    echo "Verifica que estés logueado en Supabase CLI"
    echo "Ejecuta: npx supabase login"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Instalación completada exitosamente!"
echo "=========================================="
echo ""
echo "Ahora puedes:"
echo "1. Ir a cualquier Aula Virtual"
echo "2. Hacer clic en la pestaña 'Asistencia'"
echo "3. Registrar la asistencia diaria de tus estudiantes"
echo ""
echo "¡Disfruta del nuevo sistema de asistencia!"
