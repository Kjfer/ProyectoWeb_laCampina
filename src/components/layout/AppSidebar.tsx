import { 
  BookOpen, 
  Calendar, 
  FileText, 
  GraduationCap, 
  Home, 
  MessageSquare, 
  Settings, 
  Users,
  Library,
  ClipboardList,
  Brain,
  HelpCircle
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Cursos", url: "/courses", icon: BookOpen },
  { title: "Tareas", url: "/assignments", icon: FileText },
  { title: "Exámenes", url: "/exams", icon: ClipboardList },
  { title: "Calendario", url: "/calendar", icon: Calendar },
];

const resourceItems = [
  { title: "Biblioteca", url: "/library", icon: Library },
  { title: "Mensajes", url: "/messages", icon: MessageSquare },
  { title: "Compañeros", url: "/classmates", icon: Users },
  { title: "Juegos Mentales", url: "/mental-games", icon: Brain },
  { title: "Soporte", url: "/support", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
      isActive 
        ? "bg-gradient-primary text-primary-foreground shadow-soft font-medium" 
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <Sidebar className={`border-r border-border ${collapsed ? "w-16" : "w-64"}`}>
      <SidebarContent className="p-4">
        {/* Logo/Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-foreground text-sm">IE La Campiña</h2>
                <p className="text-xs text-muted-foreground">Aula Virtual</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {!collapsed && "Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {!collapsed && "Recursos"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {resourceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        {!collapsed && (
          <div className="mt-auto pt-6">
            <SidebarMenuButton asChild isActive={isActive("/settings")}>
              <Link to="/settings" className="flex items-center gap-3">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configuración</span>
              </Link>
            </SidebarMenuButton>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}