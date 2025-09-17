import uuid
from django.db import models


ATTENDANCE_STATUS_CHOICES = [
    ('present', 'Presente'),
    ('absent', 'Ausente'),
    ('late', 'Tardío'),
    ('excused', 'Justificado'),
]


class Attendance(models.Model):
    """
    Model mapping to Supabase public.attendance table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course_id = models.UUIDField()  # References courses.id
    student_id = models.UUIDField()  # References profiles.id
    date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='present'
    )
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.UUIDField(null=True, blank=True)  # References profiles.id
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendance'  # Usar la tabla existente de Supabase
        verbose_name = 'Asistencia'
        verbose_name_plural = 'Asistencias'
        unique_together = ['course_id', 'student_id', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"Attendance {self.student_id} - {self.course_id} - {self.date}"
