export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          priority: string | null
          target_roles: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string | null
          content: string | null
          feedback: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          graded_at: string | null
          id: string
          mime_type: string | null
          score: number | null
          student_id: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          content?: string | null
          feedback?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          graded_at?: string | null
          id?: string
          mime_type?: string | null
          score?: number | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          content?: string | null
          feedback?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          graded_at?: string | null
          id?: string
          mime_type?: string | null
          score?: number | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_published: boolean | null
          max_score: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          course_id: string | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          message: string
          response: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          response: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
          response?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string | null
          enrolled_at: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_forum_posts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          parent_post_id: string | null
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          parent_post_id?: string | null
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          parent_post_id?: string | null
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_forum_topics: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          position?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_resources: {
        Row: {
          created_at: string | null
          description: string | null
          file_size: number | null
          id: string
          is_published: boolean | null
          module_id: string
          position: number
          resource_type: string
          resource_url: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          id?: string
          is_published?: boolean | null
          module_id: string
          position?: number
          resource_type: string
          resource_url?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          position?: number
          resource_type?: string
          resource_url?: string | null
          title?: string
        }
        Relationships: []
      }
      course_weekly_resources: {
        Row: {
          allows_student_submissions: boolean | null
          assignment_deadline: string | null
          created_at: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_published: boolean | null
          max_score: number | null
          mime_type: string | null
          position: number
          resource_type: string
          resource_url: string | null
          section_id: string
          settings: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allows_student_submissions?: boolean | null
          assignment_deadline?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          mime_type?: string | null
          position?: number
          resource_type: string
          resource_url?: string | null
          section_id: string
          settings?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allows_student_submissions?: boolean | null
          assignment_deadline?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          mime_type?: string | null
          position?: number
          resource_type?: string
          resource_url?: string | null
          section_id?: string
          settings?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_weekly_resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_weekly_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_weekly_sections: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_published: boolean | null
          position: number
          start_date: string | null
          title: string
          updated_at: string | null
          week_number: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_published?: boolean | null
          position?: number
          start_date?: string | null
          title: string
          updated_at?: string | null
          week_number: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_published?: boolean | null
          position?: number
          start_date?: string | null
          title?: string
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_weekly_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          academic_year: string
          classroom_id: string | null
          code: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          semester: string
          start_date: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          classroom_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          semester: string
          start_date?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          classroom_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          semester?: string
          start_date?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "virtual_classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean | null
          max_score: number | null
          start_time: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          start_time: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          duration_seconds: number | null
          game_id: string | null
          id: string
          player_id: string | null
          score: number
        }
        Insert: {
          completed_at?: string | null
          duration_seconds?: number | null
          game_id?: string | null
          id?: string
          player_id?: string | null
          score: number
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          game_id?: string | null
          id?: string
          player_id?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mental_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_games: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          game_type: string
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          game_type: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          game_type?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_relationships: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          parent_id: string | null
          relationship_type: string
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          parent_id?: string | null
          relationship_type: string
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          parent_id?: string | null
          relationship_type?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_relationships_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          id: string
          options: Json | null
          points: number | null
          position: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          position?: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          position?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          answers: Json
          attempt_number: number | null
          id: string
          quiz_id: string
          score: number | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers: Json
          attempt_number?: number | null
          id?: string
          quiz_id: string
          score?: number | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          attempt_number?: number | null
          id?: string
          quiz_id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_published: boolean | null
          max_attempts: number | null
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          max_attempts?: number | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          max_attempts?: number | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          reservation_date: string
          service_name: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          reservation_date: string
          service_name: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          reservation_date?: string
          service_name?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          course_id: string
          id: string
          module_id: string | null
          progress_type: string
          resource_id: string | null
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          course_id: string
          id?: string
          module_id?: string | null
          progress_type: string
          resource_id?: string | null
          student_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          course_id?: string
          id?: string
          module_id?: string | null
          progress_type?: string
          resource_id?: string | null
          student_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          id: string
          respondent_id: string | null
          responses: Json
          submitted_at: string | null
          survey_id: string | null
        }
        Insert: {
          id?: string
          respondent_id?: string | null
          responses: Json
          submitted_at?: string | null
          survey_id?: string | null
        }
        Update: {
          id?: string
          respondent_id?: string | null
          responses?: Json
          submitted_at?: string | null
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          questions: Json
          target_role: Database["public"]["Enums"]["user_role"]
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          questions: Json
          target_role: Database["public"]["Enums"]["user_role"]
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          questions?: Json
          target_role?: Database["public"]["Enums"]["user_role"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_classrooms: {
        Row: {
          academic_year: string
          created_at: string | null
          education_level: Database["public"]["Enums"]["education_level"]
          grade: string
          id: string
          is_active: boolean | null
          name: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          education_level: Database["public"]["Enums"]["education_level"]
          grade: string
          id?: string
          is_active?: boolean | null
          name: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          education_level?: Database["public"]["Enums"]["education_level"]
          grade?: string
          id?: string
          is_active?: boolean | null
          name?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_classrooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_weekly_sections: {
        Args: {
          course_id_param: string
          end_date_param: string
          start_date_param: string
        }
        Returns: undefined
      }
      get_current_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_student_classroom_ids: {
        Args: { student_profile_id: string }
        Returns: string[]
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_parent_of_student: {
        Args: { _student_id: string }
        Returns: boolean
      }
    }
    Enums: {
      education_level: "primaria" | "secundaria"
      user_role: "admin" | "teacher" | "student" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      education_level: ["primaria", "secundaria"],
      user_role: ["admin", "teacher", "student", "parent"],
    },
  },
} as const
