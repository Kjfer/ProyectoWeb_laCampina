import { 
  Home, 
  BookOpen, 
  FileText, 
  School, 
  ClipboardList,
  Users,
  UserCog,
  BarChart3,
  Calendar,
  MessageSquare,
  Library,
  Brain,
  HelpCircle,
  Settings
} from 'lucide-react';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'tutor';

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles: UserRole[];
}

export const navigationItems: NavItem[] = [
  // Dashboard
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
    roles: ['admin', 'teacher', 'student', 'parent']
  },
  
  // Dashboard Tutor
  {
    title: 'Dashboard',
    url: '/tutor-dashboard',
    icon: Home,
    roles: ['tutor']
  },
  
  // Aulas Virtuales
  {
    title: 'Aulas Virtuales',
    url: '/virtual-classrooms',
    icon: School,
    roles: ['admin', 'teacher', 'student']
  },
  
  // Cursos
  {
    title: 'Mis Cursos',
    url: '/courses',
    icon: BookOpen,
    roles: ['teacher', 'student']
  },
  
  // Tareas
  {
    title: 'Tareas',
    url: '/assignments',
    icon: FileText,
    roles: ['teacher', 'student']
  },
  
  // Exámenes
  {
    title: 'Exámenes',
    url: '/exams',
    icon: ClipboardList,
    roles: ['teacher', 'student']
  },
  
  // Calendario
  {
    title: 'Calendario',
    url: '/calendar',
    icon: Calendar,
    roles: ['admin', 'teacher', 'student', 'parent', 'tutor']
  },
  
  // Biblioteca
  {
    title: 'Biblioteca',
    url: '/library',
    icon: Library,
    roles: ['admin', 'teacher', 'student']
  },
  
  // Mensajes
  {
    title: 'Mensajes',
    url: '/messages',
    icon: MessageSquare,
    roles: ['admin', 'teacher', 'student', 'parent', 'tutor']
  },
  
  // Compañeros (solo estudiantes)
  {
    title: 'Compañeros',
    url: '/classmates',
    icon: Users,
    roles: ['student']
  },
  
  // Juegos Mentales
  {
    title: 'Juegos Mentales',
    url: '/mental-games',
    icon: Brain,
    roles: ['student']
  },
  
  // Soporte
  {
    title: 'Soporte',
    url: '/support',
    icon: HelpCircle,
    roles: ['admin', 'teacher', 'student', 'parent', 'tutor']
  }
];

export const adminNavigationItems: NavItem[] = [
  {
    title: 'Gestión de Cursos',
    url: '/admin/courses',
    icon: BookOpen,
    roles: ['admin']
  },
  {
    title: 'Gestión de Estudiantes',
    url: '/admin/students',
    icon: Users,
    roles: ['admin']
  },
  {
    title: 'Importación Masiva',
    url: '/admin/bulk-import',
    icon: Users,
    roles: ['admin']
  },
  {
    title: 'Gestión de Usuarios',
    url: '/admin/users',
    icon: UserCog,
    roles: ['admin']
  },
  {
    title: 'Aulas Virtuales',
    url: '/admin/classrooms',
    icon: School,
    roles: ['admin']
  },
  {
    title: 'Reportes',
    url: '/admin/reports',
    icon: BarChart3,
    roles: ['admin']
  },
  {
    title: 'Configuración',
    url: '/admin/settings',
    icon: Settings,
    roles: ['admin']
  }
];

export function getNavigationForRole(role: UserRole): NavItem[] {
  if (role === 'admin') {
    return [
      ...navigationItems.filter(item => item.roles.includes(role)),
      ...adminNavigationItems
    ];
  }
  
  return navigationItems.filter(item => item.roles.includes(role));
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  const allItems = [...navigationItems, ...adminNavigationItems];
  const item = allItems.find(item => item.url === path);
  
  if (!item) return true; // Allow access to unregistered routes
  
  return item.roles.includes(role);
}
