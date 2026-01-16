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
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          color: string | null
          description: string | null
          earned_at: string
          icon: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          color?: string | null
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          color?: string | null
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ad_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_badge_reads: {
        Row: {
          badge_key: string
          created_at: string
          id: string
          seen_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          id?: string
          seen_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          id?: string
          seen_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          admin_id: string
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          submitted_by: string | null
          title: string
          type: string
        }
        Insert: {
          admin_id: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          submitted_by?: string | null
          title: string
          type: string
        }
        Update: {
          admin_id?: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          submitted_by?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          ad_code: string | null
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          placement: string
          priority: number
          redirect_url: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          ad_code?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          placement: string
          priority?: number
          redirect_url?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          ad_code?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          placement?: string
          priority?: number
          redirect_url?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      annotation_replies: {
        Row: {
          annotation_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          annotation_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          annotation_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotation_replies_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "post_annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotation_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_history: {
        Row: {
          action: string
          content_id: string
          content_type: string
          created_at: string
          feedback: string | null
          id: string
          performed_by: string
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          created_at?: string
          feedback?: string | null
          id?: string
          performed_by: string
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          created_at?: string
          feedback?: string | null
          id?: string
          performed_by?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          career_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          career_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          career_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_assignments_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      career_courses: {
        Row: {
          career_id: string
          course_id: string
          created_at: string
          id: string
          skill_contributions: Json | null
        }
        Insert: {
          career_id: string
          course_id: string
          created_at?: string
          id?: string
          skill_contributions?: Json | null
        }
        Update: {
          career_id?: string
          course_id?: string
          created_at?: string
          id?: string
          skill_contributions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "career_courses_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      career_skills: {
        Row: {
          career_id: string
          color: string | null
          created_at: string
          display_order: number
          icon: string | null
          id: string
          skill_name: string
          weight: number
        }
        Insert: {
          career_id: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          skill_name: string
          weight?: number
        }
        Update: {
          career_id?: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          skill_name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "career_skills_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      careers: {
        Row: {
          author_id: string | null
          color: string
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          display_name: string | null
          id: string
          is_anonymous: boolean
          parent_id: string | null
          post_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          parent_id?: string | null
          post_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          parent_id?: string | null
          post_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string
          id: string
          reason: string | null
          report_type: string
          reporter_email: string | null
          reporter_id: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description: string
          id?: string
          reason?: string | null
          report_type: string
          reporter_email?: string | null
          reporter_id?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string
          id?: string
          reason?: string | null
          report_type?: string
          reporter_email?: string | null
          reporter_id?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_annotation_replies: {
        Row: {
          annotation_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          annotation_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          annotation_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_annotation_replies_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "course_annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_annotations: {
        Row: {
          author_id: string
          bubble_index: number | null
          comment: string
          course_id: string
          created_at: string
          editor_type: string | null
          id: string
          selected_text: string
          selection_end: number
          selection_start: number
          status: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          author_id: string
          bubble_index?: number | null
          comment: string
          course_id: string
          created_at?: string
          editor_type?: string | null
          id?: string
          selected_text: string
          selection_end: number
          selection_start: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          author_id?: string
          bubble_index?: number | null
          comment?: string
          course_id?: string
          created_at?: string
          editor_type?: string | null
          id?: string
          selected_text?: string
          selection_end?: number
          selection_start?: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_annotations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_annotations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
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
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_versions: {
        Row: {
          change_summary: string | null
          content: string
          course_id: string
          created_at: string
          edited_by: string
          editor_role: string | null
          editor_type: string | null
          id: string
          is_published: boolean | null
          status: string
          version_number: number
          versioning_note_locked: boolean
          versioning_note_type: string | null
        }
        Insert: {
          change_summary?: string | null
          content: string
          course_id: string
          created_at?: string
          edited_by: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string
          course_id?: string
          created_at?: string
          edited_by?: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_versions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          assigned_to: string | null
          author_id: string | null
          created_at: string
          default_senior_moderator: string | null
          description: string | null
          featured: boolean | null
          featured_image: string | null
          icon: string | null
          id: string
          learning_hours: number | null
          level: string | null
          name: string
          slug: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          author_id?: string | null
          created_at?: string
          default_senior_moderator?: string | null
          description?: string | null
          featured?: boolean | null
          featured_image?: string | null
          icon?: string | null
          id?: string
          learning_hours?: number | null
          level?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          author_id?: string | null
          created_at?: string
          default_senior_moderator?: string | null
          description?: string | null
          featured?: boolean | null
          featured_image?: string | null
          icon?: string | null
          id?: string
          learning_hours?: number | null
          level?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delete_requests: {
        Row: {
          content_id: string
          content_title: string
          content_type: string
          created_at: string
          id: string
          reason: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_title: string
          content_type: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_title?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      difficulty_levels: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          course_id: string
          id: string
          lesson_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          id?: string
          lesson_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          id?: string
          lesson_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_time_tracking: {
        Row: {
          course_id: string
          created_at: string
          duration_seconds: number
          id: string
          lesson_id: string
          tracked_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id: string
          tracked_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id?: string
          tracked_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_notifications: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          annotations: boolean
          changes_requested: boolean
          content_approved: boolean
          content_rejected: boolean
          content_submissions: boolean
          created_at: string
          delete_requests: boolean
          email_notifications: boolean
          id: string
          new_users: boolean
          reports: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          annotations?: boolean
          changes_requested?: boolean
          content_approved?: boolean
          content_rejected?: boolean
          content_submissions?: boolean
          created_at?: string
          delete_requests?: boolean
          email_notifications?: boolean
          id?: string
          new_users?: boolean
          reports?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          annotations?: boolean
          changes_requested?: boolean
          content_approved?: boolean
          content_rejected?: boolean
          content_submissions?: boolean
          created_at?: string
          delete_requests?: boolean
          email_notifications?: boolean
          id?: string
          new_users?: boolean
          reports?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          notification_type: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          notification_type: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          notification_type?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_annotations: {
        Row: {
          author_id: string
          bubble_index: number | null
          comment: string
          created_at: string
          editor_type: string | null
          id: string
          post_id: string
          selected_text: string
          selection_end: number
          selection_start: number
          status: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          author_id: string
          bubble_index?: number | null
          comment: string
          created_at?: string
          editor_type?: string | null
          id?: string
          post_id: string
          selected_text: string
          selection_end: number
          selection_start: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          author_id?: string
          bubble_index?: number | null
          comment?: string
          created_at?: string
          editor_type?: string | null
          id?: string
          post_id?: string
          selected_text?: string
          selection_end?: number
          selection_start?: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_annotations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_annotations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_annotations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "post_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          platform: string
          post_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          post_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          post_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      post_version_bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_version_bookmarks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "post_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_versions: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string
          editor_role: string | null
          editor_type: string | null
          id: string
          is_published: boolean | null
          post_id: string
          status: string
          version_number: number
          versioning_note_locked: boolean
          versioning_note_type: string | null
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          post_id: string
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          post_id?: string
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          assigned_to: string | null
          author_id: string
          category_id: string | null
          code_theme: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          lesson_order: number | null
          parent_id: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          author_id: string
          category_id?: string | null
          code_theme?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          lesson_order?: number | null
          parent_id?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          author_id?: string
          category_id?: string | null
          code_theme?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          lesson_order?: number | null
          parent_id?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_course_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number | null
          email: string
          full_name: string | null
          id: string
          last_activity_date: string | null
          last_freeze_date: string | null
          max_streak: number | null
          selected_career: string | null
          streak_freezes_available: number
          streak_freezes_used: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number | null
          email: string
          full_name?: string | null
          id: string
          last_activity_date?: string | null
          last_freeze_date?: string | null
          max_streak?: number | null
          selected_career?: string | null
          streak_freezes_available?: number
          streak_freezes_used?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number | null
          email?: string
          full_name?: string | null
          id?: string
          last_activity_date?: string | null
          last_freeze_date?: string | null
          max_streak?: number | null
          selected_career?: string | null
          streak_freezes_available?: number
          streak_freezes_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          created_at: string
          destination_url: string
          hit_count: number
          id: string
          is_active: boolean
          redirect_type: number
          source_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_url: string
          hit_count?: number
          id?: string
          is_active?: boolean
          redirect_type?: number
          source_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_url?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          redirect_type?: number
          source_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_invalidations: {
        Row: {
          created_by: string | null
          id: string
          invalidated_at: string
          reason: string
          user_id: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          invalidated_at?: string
          reason?: string
          user_id: string
        }
        Update: {
          created_by?: string | null
          id?: string
          invalidated_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          announcement_bg_color: string | null
          announcement_enabled: boolean | null
          announcement_end_date: string | null
          announcement_link_text: string | null
          announcement_link_url: string | null
          announcement_message: string | null
          announcement_start_date: string | null
          announcement_text_color: string | null
          code_theme: string | null
          course_avatar_gradient_from: string | null
          course_avatar_gradient_to: string | null
          course_bubble_bg: string | null
          course_bubble_text: string | null
          created_at: string
          facebook_url: string | null
          github_url: string | null
          hero_headline: string | null
          hero_highlight_color: string | null
          hero_highlight_text: string | null
          hero_quick_links: Json | null
          hero_subheadline: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          mentor_avatar_gradient_from: string | null
          mentor_avatar_gradient_to: string | null
          mentor_bubble_bg: string | null
          mentor_bubble_text: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          notification_window_days: number | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          schema_address: string | null
          schema_contact_email: string | null
          schema_phone: string | null
          schema_same_as: string[] | null
          schema_type: string | null
          search_placeholders: string[] | null
          site_description: string | null
          site_name: string
          site_url: string | null
          twitter_card_type: string | null
          twitter_site: string | null
          twitter_url: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_end_date?: string | null
          announcement_link_text?: string | null
          announcement_link_url?: string | null
          announcement_message?: string | null
          announcement_start_date?: string | null
          announcement_text_color?: string | null
          code_theme?: string | null
          course_avatar_gradient_from?: string | null
          course_avatar_gradient_to?: string | null
          course_bubble_bg?: string | null
          course_bubble_text?: string | null
          created_at?: string
          facebook_url?: string | null
          github_url?: string | null
          hero_headline?: string | null
          hero_highlight_color?: string | null
          hero_highlight_text?: string | null
          hero_quick_links?: Json | null
          hero_subheadline?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          mentor_avatar_gradient_from?: string | null
          mentor_avatar_gradient_to?: string | null
          mentor_bubble_bg?: string | null
          mentor_bubble_text?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          notification_window_days?: number | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          schema_address?: string | null
          schema_contact_email?: string | null
          schema_phone?: string | null
          schema_same_as?: string[] | null
          schema_type?: string | null
          search_placeholders?: string[] | null
          site_description?: string | null
          site_name?: string
          site_url?: string | null
          twitter_card_type?: string | null
          twitter_site?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_end_date?: string | null
          announcement_link_text?: string | null
          announcement_link_url?: string | null
          announcement_message?: string | null
          announcement_start_date?: string | null
          announcement_text_color?: string | null
          code_theme?: string | null
          course_avatar_gradient_from?: string | null
          course_avatar_gradient_to?: string | null
          course_bubble_bg?: string | null
          course_bubble_text?: string | null
          created_at?: string
          facebook_url?: string | null
          github_url?: string | null
          hero_headline?: string | null
          hero_highlight_color?: string | null
          hero_highlight_text?: string | null
          hero_quick_links?: Json | null
          hero_subheadline?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          mentor_avatar_gradient_from?: string | null
          mentor_avatar_gradient_to?: string | null
          mentor_bubble_bg?: string | null
          mentor_bubble_text?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          notification_window_days?: number | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          schema_address?: string | null
          schema_contact_email?: string | null
          schema_phone?: string | null
          schema_same_as?: string[] | null
          schema_type?: string | null
          search_placeholders?: string[] | null
          site_description?: string | null
          site_name?: string
          site_url?: string | null
          twitter_card_type?: string | null
          twitter_site?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      social_media_clicks: {
        Row: {
          clicked_at: string
          id: string
          platform: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          platform: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          platform?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_notification_preference: {
        Args: { p_preference_type: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_career: {
        Args: { _career_id: string; _user_id: string }
        Returns: boolean
      }
      owns_course_via_career: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      owns_post_via_career: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "senior_moderator"
        | "super_moderator"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "senior_moderator",
        "super_moderator",
      ],
    },
  },
} as const
