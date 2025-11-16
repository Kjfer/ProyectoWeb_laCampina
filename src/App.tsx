import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Assignments from "./pages/Assignments";
import AssignmentReview from "./pages/AssignmentReview";
import Exams from "./pages/Exams";
import ExamTaking from "./pages/ExamTaking";
import ExamSubmissionsPage from "./pages/ExamSubmissionsPage";
import ExamGradingPage from "./pages/ExamGradingPage";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import VirtualClassrooms from "./pages/VirtualClassrooms";
import VirtualClassroomDetail from "./pages/VirtualClassroomDetail";
import VirtualClassroomCourses from "./pages/VirtualClassroomCourses";
import Calendar from "./pages/Calendar";
import NotFound from "./pages/NotFound";
import AdminBulkStudentImport from "./pages/AdminBulkStudentImport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/courses" element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            } />
            <Route path="/courses/:id" element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/assignments" element={
              <ProtectedRoute>
                <Assignments />
              </ProtectedRoute>
            } />
            <Route path="/assignments/:assignmentId/review" element={
              <ProtectedRoute>
                <AssignmentReview />
              </ProtectedRoute>
            } />
            <Route path="/exams" element={
              <ProtectedRoute>
                <Exams />
              </ProtectedRoute>
            } />
            <Route path="/exams/:examId/take" element={
              <ProtectedRoute>
                <ExamTaking />
              </ProtectedRoute>
            } />
            <Route path="/exam-submissions/:examId" element={
              <ProtectedRoute>
                <ExamSubmissionsPage />
              </ProtectedRoute>
            } />
            <Route path="/exam-grading/:submissionId" element={
              <ProtectedRoute>
                <ExamGradingPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/virtual-classrooms" element={
              <ProtectedRoute>
                <VirtualClassrooms />
              </ProtectedRoute>
            } />
            <Route path="/virtual-classrooms/:id" element={
              <ProtectedRoute>
                <VirtualClassroomDetail />
              </ProtectedRoute>
            } />
            <Route path="/virtual-classrooms/:id/courses" element={
              <ProtectedRoute>
                <VirtualClassroomCourses />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            <Route path="/admin/bulk-import" element={
              <ProtectedRoute>
                <AdminBulkStudentImport />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
