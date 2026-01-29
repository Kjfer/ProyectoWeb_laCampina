// =====================================================
// TIPOS TYPESCRIPT: Nuevo modelo de negocio Peri Institute
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// TIPOS DE DATOS PRINCIPALES
// ============================================

export interface Programa {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string | null;
  code: string; // program_id + "-" + mes corto MAYUS + "-" + año
  program_id: string;
  teacher_principal_id: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  start_date: string;
  end_date?: string | null;
  numero_modulos: number;
  material: 'book' | 'kit' | 'none';
  created_at: string;
  updated_at: string;
}

export interface Modulo {
  id: string;
  name: string;
  num_modulo: number;
  description?: string | null;
  code: string; // program_id + "-M" + num + "-" + mes + "-" + año
  course_id: string;
  teacher_principal_id: string;
  academic_year: string;
  semester_year: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  schedule?: ModuloSchedule | null;
  aditional_teachers?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ModuloSchedule {
  [dia: string]: string; // { "lunes": "10:00-12:00", "miércoles": "14:00-16:00" }
}

export interface CursoGrabado {
  id: string;
  name: string;
  description?: string | null;
  program_id?: string | null;
  video_url?: string | null;
  duration_hours?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegistroCompraMaterial {
  id: string;
  nombre: string;
  tipo_material: 'book' | 'kit';
  usuario_id: string; // Quien registró la compra
  estudiante_id: string;
  course_id: string;
  estado_pago: 'pendiente' | 'pagado' | 'cancelado';
  monto?: number | null;
  moneda_material?: string;
  fecha_registro: string;
  fecha_pago?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Matricula {
  id: string;
  cod_matricula: string; // Código único (ej: MAT-2026-0001)
  estudiante_id: string;
  student_code?: string | null;
  usuario_id: string; // Quien registró la matrícula
  modulos_matriculados: ModuloMatriculado[]; // JSONB
  num_cursos: number;
  moneda_monto: 'PEN' | 'USD' | 'EUR';
  valor_matricula: number;
  descuento: number;
  id_clases_grabadas?: string | null;
  valor_clase_grabada: number;
  book_incluido: boolean;
  kit_incluido: boolean;
  precio_final: number;
  observaciones?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuloMatriculado {
  modulo_id: string;
  nombre: string;
  code: string;
  course_name?: string;
  start_date?: string;
  end_date?: string;
}

export interface VentaCursoGrabado {
  id: string;
  estudiante_id: string;
  usuario_id: string;
  id_clases_grabadas: string;
  valor_venta: number;
  moneda_venta?: string;
  matricula_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pago {
  id: string;
  codigo_producto: string; // cod_matricula, id material, id curso grabado
  categoria_producto: 'matricula' | 'kits' | 'books' | 'clases_grabadas';
  comprobante?: string | null;
  monto_pago: number;
  fecha_pago: string;
  metodo_pago: 'BCP' | 'Interbank' | 'Banco de la Nación' | 'BBVA' | 'Scotiabank' | 'Yape' | 'Plin' | 'Tarjeta LINK' | 'En efectivo' | 'Paypal';
  moneda_pago: 'PEN' | 'USD' | 'EUR';
  estado_pago: 'primera_cuota' | 'pago_regular' | 'cuotas_restantes';
  usuario_id: string;
  estudiante_id?: string | null;
  observaciones?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  modulo_id: string;
  student_id: string;
  matricula_id?: string | null;
  tipo_estudiante: 'nuevo' | 'antiguo';
  enrolled_at: string;
  is_active: boolean;
  payment_status?: 'pending' | 'verified' | 'blocked';
  payment_verified_by?: string | null;
  payment_verified_at?: string | null;
  payment_notes?: string | null;
}

// ============================================
// TIPOS CON RELACIONES (para queries)
// ============================================

export interface CourseWithRelations extends Course {
  programa?: Programa;
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  modulos?: Modulo[];
}

export interface ModuloWithRelations extends Modulo {
  course?: CourseWithRelations;
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  enrollments?: CourseEnrollment[];
}

export interface MatriculaWithRelations extends Matricula {
  estudiante?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_code?: string;
  };
  usuario?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  curso_grabado?: CursoGrabado;
  pagos?: Pago[];
}

export interface PagoWithRelations extends Pago {
  estudiante?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  usuario?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface EnrollmentWithRelations extends CourseEnrollment {
  modulo?: ModuloWithRelations;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  matricula?: Matricula;
}

// ============================================
// TIPOS PARA INSERCIÓN
// ============================================

export type ProgramaInsert = Omit<Programa, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ModuloInsert = Omit<Modulo, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MatriculaInsert = Omit<Matricula, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PagoInsert = Omit<Pago, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type RegistroCompraMaterialInsert = Omit<RegistroCompraMaterial, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CursoGrabadoInsert = Omit<CursoGrabado, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type VentaCursoGrabadoInsert = Omit<VentaCursoGrabado, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CourseEnrollmentInsert = Omit<CourseEnrollment, 'id' | 'enrolled_at'> & {
  id?: string;
  enrolled_at?: string;
};

// ============================================
// TIPOS PARA ACTUALIZACIÓN
// ============================================

export type ProgramaUpdate = Partial<Omit<Programa, 'id' | 'created_at' | 'updated_at'>>;
export type CourseUpdate = Partial<Omit<Course, 'id' | 'created_at' | 'updated_at'>>;
export type ModuloUpdate = Partial<Omit<Modulo, 'id' | 'created_at' | 'updated_at'>>;
export type MatriculaUpdate = Partial<Omit<Matricula, 'id' | 'created_at' | 'updated_at'>>;
export type PagoUpdate = Partial<Omit<Pago, 'id' | 'created_at' | 'updated_at'>>;

// ============================================
// TIPOS UTILITARIOS
// ============================================

export interface MatriculaFormData {
  estudiante_id: string;
  student_code?: string;
  modulos_seleccionados: string[]; // IDs de módulos
  valor_matricula: number;
  descuento: number;
  moneda: 'PEN' | 'USD' | 'EUR';
  incluir_clases_grabadas: boolean;
  id_clases_grabadas?: string;
  valor_clase_grabada?: number;
  book_incluido: boolean;
  monto_book?: number;
  moneda_book?: string;
  kit_incluido: boolean;
  monto_kit?: number;
  moneda_kit?: string;
  observaciones?: string;
  // Datos del pago inicial (opcional)
  registrar_pago_inicial: boolean;
  tipo_pago?: 'primera_cuota' | 'pago_regular' | 'cuotas_restantes';
  monto_pago?: number;
  metodo_pago?: 'BCP' | 'Interbank' | 'Banco de la Nación' | 'BBVA' | 'Scotiabank' | 'Yape' | 'Plin' | 'Tarjeta LINK' | 'En efectivo' | 'Paypal';
  fecha_pago?: string;
  comprobante?: string;
}

export interface PagoFormData {
  categoria_producto: 'matricula' | 'kits' | 'books' | 'clases_grabadas';
  codigo_producto: string;
  estudiante_id?: string;
  monto_pago: number;
  fecha_pago: string;
  metodo_pago: 'BCP' | 'Interbank' | 'Banco de la Nación' | 'BBVA' | 'Scotiabank' | 'Yape' | 'Plin' | 'Tarjeta LINK' | 'En efectivo' | 'Paypal';
  moneda_pago: 'PEN' | 'USD' | 'EUR';
  estado_pago: 'primera_cuota' | 'pago_regular' | 'cuotas_restantes';
  comprobante?: string;
  observaciones?: string;
}

export interface CourseCreationData {
  name: string;
  description?: string;
  program_id: string;
  teacher_principal_id: string;
  academic_year: string;
  semester: string;
  start_date: string;
  end_date?: string;
  numero_modulos: number;
  material: 'book' | 'kit' | 'none';
  // Datos para generar módulos automáticamente
  modulos?: ModuloCreationData[];
}

export interface ModuloCreationData {
  name: string;
  description?: string;
  num_modulo: number;
  teacher_principal_id: string;
  start_date: string;
  end_date: string;
  schedule?: ModuloSchedule;
  aditional_teachers?: string[];
}

// ============================================
// CONSTANTES
// ============================================

export const MONEDAS = [
  'PEN', // Perú - Nuevo Sol
  'USD', // Estados Unidos - Dólar
  'EUR', // Eurozona - Euro
  'MXN', // México - Peso Mexicano
  'CLP', // Chile - Peso Chileno
  'ARS', // Argentina - Peso Argentino
  'COP', // Colombia - Peso Colombiano
  'BRL', // Brasil - Real
  'UYU', // Uruguay - Peso Uruguayo
  'BOB', // Bolivia - Boliviano
  'PYG', // Paraguay - Guaraní
  'VES', // Venezuela - Bolívar
] as const;
export const TIPOS_MATERIAL = ['book', 'kit'] as const;
export const ESTADOS_PAGO = ['pendiente', 'pagado', 'cancelado'] as const;
export const METODOS_PAGO = [
  'BCP', 
  'Interbank', 
  'Banco de la Nación', 
  'BBVA', 
  'Scotiabank',
  'Yape',
  'Plin',
  'Tarjeta LINK', 
  'En efectivo', 
  'Paypal'
] as const;
export const TIPOS_PAGO = ['primera_cuota', 'pago_regular', 'cuotas_restantes'] as const;
export const CATEGORIAS_PRODUCTO = ['matricula', 'kits', 'books', 'clases_grabadas'] as const;
export const TIPOS_ESTUDIANTE = ['nuevo', 'antiguo'] as const;

// ============================================
// HELPERS DE GENERACIÓN DE CÓDIGOS
// ============================================

export const generateCourseCode = (programCode: string, date: Date): string => {
  const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${programCode}-${month}-${year}`;
};

export const generateModuloCode = (programCode: string, numModulo: number, date: Date): string => {
  const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${programCode}-M${numModulo}-${month}-${year}`;
};

export const generateMatriculaCode = (year: number, sequential: number): string => {
  const paddedSeq = String(sequential).padStart(5, '0');
  return `MAT-${year}-${paddedSeq}`;
};

export const calculatePrecioFinal = (
  valorMatricula: number,
  valorClaseGrabada: number,
  descuento: number
): number => {
  return valorMatricula + valorClaseGrabada - descuento;
};
