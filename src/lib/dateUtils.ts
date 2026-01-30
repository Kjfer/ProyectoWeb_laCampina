/**
 * Utilidades para manejo de fechas en la aplicación
 * Evita problemas de zona horaria al mostrar fechas de base de datos
 */

/**
 * Formatea una fecha en formato YYYY-MM-DD a DD/MM/YYYY
 * Útil para fechas almacenadas en base de datos sin componente de tiempo
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  // Si ya viene en formato ISO date (YYYY-MM-DD), solo reformatear
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }
  
  // Si viene con timestamp, extraer solo la fecha
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
};

/**
 * Formatea un timestamp completo a fecha y hora
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Retorna la fecha tal cual está en la base de datos (YYYY-MM-DD)
 * Sin ninguna transformación
 */
export const getRawDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  // Si es un date puro (sin tiempo), retornar tal cual
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Si tiene timestamp, extraer solo la parte de fecha
  return dateString.split('T')[0];
};
