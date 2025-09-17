import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Assignment(models.Model):
    """
    Assignment model mapping to Supabase public.assignments table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course_id = models.UUIDField()  # References courses.id
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    max_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        validators=[MinValueValidator(0), MaxValueValidator(999.99)]
    )
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assignments'  # Usar la tabla existente de Supabase
        verbose_name = 'Asignación'
        verbose_name_plural = 'Asignaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f"Assignment {self.course_id} - {self.title}"


class AssignmentSubmission(models.Model):
    """
    Model mapping to Supabase public.assignment_submissions table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment_id = models.UUIDField()  # References assignments.id
    student_id = models.UUIDField()  # References profiles.id
    content = models.TextField(blank=True, null=True)
    file_url = models.URLField(blank=True, null=True)
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)]
    )
    feedback = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'assignment_submissions'  # Usar la tabla existente de Supabase
        verbose_name = 'Entrega'
        verbose_name_plural = 'Entregas'
        unique_together = ['assignment_id', 'student_id']
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Submission {self.student_id} - {self.assignment_id}"

    @property
    def is_graded(self):
        return self.score is not None
