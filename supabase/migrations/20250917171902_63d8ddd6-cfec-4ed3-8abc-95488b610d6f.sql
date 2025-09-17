-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = _role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to check if user is student's parent
CREATE OR REPLACE FUNCTION public.is_parent_of_student(_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_relationships psr
    JOIN public.profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid() AND psr.student_id = _student_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Fix search_path for existing functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role('admin'::user_role));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role('admin'::user_role));

-- RLS Policies for courses table
CREATE POLICY "Teachers can view their courses" ON public.courses
  FOR SELECT USING (teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view enrolled courses" ON public.courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      JOIN public.profiles p ON p.id = ce.student_id
      WHERE ce.course_id = courses.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all courses" ON public.courses
  FOR SELECT USING (public.has_role('admin'::user_role));

CREATE POLICY "Teachers can manage their courses" ON public.courses
  FOR ALL USING (teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (public.has_role('admin'::user_role));

-- RLS Policies for course_enrollments table
CREATE POLICY "Students can view their enrollments" ON public.course_enrollments
  FOR SELECT USING (student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view enrollments in their courses" ON public.course_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE c.id = course_enrollments.course_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all enrollments" ON public.course_enrollments
  FOR ALL USING (public.has_role('admin'::user_role));

-- RLS Policies for assignments table
CREATE POLICY "Students can view assignments in their courses" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      JOIN public.profiles p ON p.id = ce.student_id
      WHERE ce.course_id = assignments.course_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage assignments in their courses" ON public.assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE c.id = assignments.course_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all assignments" ON public.assignments
  FOR ALL USING (public.has_role('admin'::user_role));

-- RLS Policies for assignment_submissions table
CREATE POLICY "Students can view their own submissions" ON public.assignment_submissions
  FOR SELECT USING (student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create their own submissions" ON public.assignment_submissions
  FOR INSERT WITH CHECK (student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can update their own submissions" ON public.assignment_submissions
  FOR UPDATE USING (student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view submissions in their courses" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE a.id = assignment_submissions.assignment_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can grade submissions in their courses" ON public.assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE a.id = assignment_submissions.assignment_id AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for exams table
CREATE POLICY "Students can view exams in their courses" ON public.exams
  FOR SELECT USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      JOIN public.profiles p ON p.id = ce.student_id
      WHERE ce.course_id = exams.course_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage exams in their courses" ON public.exams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE c.id = exams.course_id AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for attendance table
CREATE POLICY "Students can view their own attendance" ON public.attendance
  FOR SELECT USING (student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can manage attendance in their courses" ON public.attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE c.id = attendance.course_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's attendance" ON public.attendance
  FOR SELECT USING (public.is_parent_of_student(student_id));

-- RLS Policies for announcements table
CREATE POLICY "Users can view published announcements" ON public.announcements
  FOR SELECT USING (
    is_published = true AND 
    public.get_current_user_role() = ANY(target_roles)
  );

CREATE POLICY "Admins and teachers can manage announcements" ON public.announcements
  FOR ALL USING (
    public.has_role('admin'::user_role) OR 
    public.has_role('teacher'::user_role)
  );

-- RLS Policies for parent_student_relationships table
CREATE POLICY "Parents can view their relationships" ON public.parent_student_relationships
  FOR SELECT USING (parent_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all relationships" ON public.parent_student_relationships
  FOR ALL USING (public.has_role('admin'::user_role));

-- RLS Policies for chatbot_conversations table
CREATE POLICY "Users can view their own conversations" ON public.chatbot_conversations
  FOR SELECT USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own conversations" ON public.chatbot_conversations
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for support_tickets table
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all tickets" ON public.support_tickets
  FOR SELECT USING (public.has_role('admin'::user_role));

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (public.has_role('admin'::user_role));

-- RLS Policies for surveys table
CREATE POLICY "Target users can view active surveys" ON public.surveys
  FOR SELECT USING (
    is_active = true AND 
    (expires_at IS NULL OR expires_at > NOW()) AND
    public.get_current_user_role() = target_role
  );

CREATE POLICY "Admins can manage all surveys" ON public.surveys
  FOR ALL USING (public.has_role('admin'::user_role));

-- RLS Policies for survey_responses table
CREATE POLICY "Users can view their own responses" ON public.survey_responses
  FOR SELECT USING (respondent_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own responses" ON public.survey_responses
  FOR INSERT WITH CHECK (respondent_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all responses" ON public.survey_responses
  FOR SELECT USING (public.has_role('admin'::user_role));

-- RLS Policies for mental_games table
CREATE POLICY "All authenticated users can view active games" ON public.mental_games
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all games" ON public.mental_games
  FOR ALL USING (public.has_role('admin'::user_role));

-- RLS Policies for game_sessions table
CREATE POLICY "Users can view their own game sessions" ON public.game_sessions
  FOR SELECT USING (player_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own game sessions" ON public.game_sessions
  FOR INSERT WITH CHECK (player_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view student game sessions" ON public.game_sessions
  FOR SELECT USING (public.has_role('teacher'::user_role));

-- RLS Policies for reservations table
CREATE POLICY "Users can view their own reservations" ON public.reservations
  FOR SELECT USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own reservations" ON public.reservations
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own reservations" ON public.reservations
  FOR UPDATE USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all reservations" ON public.reservations
  FOR ALL USING (public.has_role('admin'::user_role));