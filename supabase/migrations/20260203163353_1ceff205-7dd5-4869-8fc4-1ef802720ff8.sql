-- Drop existing foreign key constraints and re-add with ON DELETE CASCADE

-- posts.category_id -> courses.id
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_course_id_fkey;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- course_enrollments.course_id -> courses.id
ALTER TABLE public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_course_id_fkey;
ALTER TABLE public.course_enrollments ADD CONSTRAINT course_enrollments_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- course_reviews.course_id -> courses.id
ALTER TABLE public.course_reviews DROP CONSTRAINT IF EXISTS course_reviews_course_id_fkey;
ALTER TABLE public.course_reviews ADD CONSTRAINT course_reviews_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- course_lessons.course_id -> courses.id
ALTER TABLE public.course_lessons DROP CONSTRAINT IF EXISTS course_lessons_course_id_fkey;
ALTER TABLE public.course_lessons ADD CONSTRAINT course_lessons_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- course_versions.course_id -> courses.id
ALTER TABLE public.course_versions DROP CONSTRAINT IF EXISTS course_versions_course_id_fkey;
ALTER TABLE public.course_versions ADD CONSTRAINT course_versions_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- course_annotations.course_id -> courses.id
ALTER TABLE public.course_annotations DROP CONSTRAINT IF EXISTS course_annotations_course_id_fkey;
ALTER TABLE public.course_annotations ADD CONSTRAINT course_annotations_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- course_assignments.course_id -> courses.id
ALTER TABLE public.course_assignments DROP CONSTRAINT IF EXISTS course_assignments_course_id_fkey;
ALTER TABLE public.course_assignments ADD CONSTRAINT course_assignments_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- course_prerequisites.course_id -> courses.id
ALTER TABLE public.course_prerequisites DROP CONSTRAINT IF EXISTS course_prerequisites_course_id_fkey;
ALTER TABLE public.course_prerequisites ADD CONSTRAINT course_prerequisites_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- career_courses.course_id -> courses.id
ALTER TABLE public.career_courses DROP CONSTRAINT IF EXISTS career_courses_course_id_fkey;
ALTER TABLE public.career_courses ADD CONSTRAINT career_courses_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- certificates.course_id -> courses.id
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_course_id_fkey;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- bookmarks.course_id -> courses.id
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_course_id_fkey;
ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- lesson_progress.course_id -> courses.id
ALTER TABLE public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_course_id_fkey;
ALTER TABLE public.lesson_progress ADD CONSTRAINT lesson_progress_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- practice_skills.course_id -> courses.id
ALTER TABLE public.practice_skills DROP CONSTRAINT IF EXISTS practice_skills_course_id_fkey;
ALTER TABLE public.practice_skills ADD CONSTRAINT practice_skills_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;