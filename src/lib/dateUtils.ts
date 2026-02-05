/**
 * Utilidades para manejo de fechas en la aplicación
 * Evita problemas de zona horaria al mostrar fechas de base de datos
 */

/**
 * Parsea una fecha desde la base de datos sin conversión UTC
 * Esto previene el desfase de horas al mostrar fechas
 */
export const parseLocalDate = (dateString: string): Date => {
  // Manejar tanto "YYYY-MM-DD HH:mm:ss" como "YYYY-MM-DDTHH:mm:ss.sssZ"
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [_, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }
  return new Date(dateString);
};

/**
 * Formatea un objeto Date a formato PostgreSQL sin conversión UTC
 * Esto previene el desfase de horas al guardar fechas
 * Formato: YYYY-MM-DD HH:mm:ss
 */
export const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

/**
 * Formatea una fecha en formato YYYY-MM-DD a DD/MM/YYYY
 * Útil para fechas almacenadas en base de datos sin componente de tiempo
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  // Convertir a string si no lo es
  const dateStr = String(dateString);
  
  // Extraer solo la parte de fecha si viene con timestamp
  const datePart = dateStr.split('T')[0];
  
  // Verificar formato YYYY-MM-DD
  if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  
  // Fallback: intentar parsear pero sin timezone
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  
  return '-';
};

/**
 * Formatea un timestamp completo a fecha y hora
 * Usa la zona horaria local del navegador (Perú) para evitar desfases
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
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

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD usando la fecha local del navegador
 * Sin conversiones UTC que causan desfases de zona horaria
 */
export const getTodayInPeru = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Convierte una fecha local del navegador a formato YYYY-MM-DD
 * asegurándose de usar la fecha local sin conversión UTC
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Suma días a una fecha manteniendo zona horaria local
 */
export const addDaysToDate = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  
  return getLocalDateString(date);
};
