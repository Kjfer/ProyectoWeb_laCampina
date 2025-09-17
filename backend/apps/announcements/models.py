import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField


PRIORITY_CHOICES = [
    ('low', 'Baja'),
    ('medium', 'Media'),
    ('high', 'Alta'),
    ('urgent', 'Urgente'),
]


class Announcement(models.Model):
    """
    Model mapping to Supabase public.announcements table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    content = models.TextField()
    author_id = models.UUIDField()  # References profiles.id
    target_roles = ArrayField(
        models.CharField(max_length=20),
        blank=True,
        null=True,
        help_text="Roles que pueden ver este anuncio. Dejar vacío para todos los roles."
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'  # Usar la tabla existente de Supabase
        verbose_name = 'Anuncio'
        verbose_name_plural = 'Anuncios'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
