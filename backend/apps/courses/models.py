import uuid
from django.db import models


class Course(models.Model):
    """
    Course model mapping to Supabase public.courses table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=20, unique=True)
    teacher_id = models.UUIDField()  # References profiles.id
    academic_year = models.CharField(max_length=20)
    semester = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'courses'  # Usar la tabla existente de Supabase
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'

    def __str__(self):
        return f"{self.code} - {self.name}"


class CourseEnrollment(models.Model):
    """
    Model mapping to Supabase public.course_enrollments table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course_id = models.UUIDField()  # References courses.id
    student_id = models.UUIDField()  # References profiles.id
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_enrollments'  # Usar la tabla existente de Supabase
        verbose_name = 'Inscripción'
        verbose_name_plural = 'Inscripciones'
        unique_together = ['course_id', 'student_id']

    def __str__(self):
        return f"Enrollment {self.course_id} - {self.student_id}"
