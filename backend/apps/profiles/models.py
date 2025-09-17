import uuid
from django.db import models


USER_ROLE_CHOICES = [
    ('admin', 'Administrador'),
    ('teacher', 'Profesor'),
    ('student', 'Estudiante'),  
    ('parent', 'Padre/Madre'),
]


class Profile(models.Model):
    """
    Profile model that maps to Supabase public.profiles table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(unique=True)  # References auth.users(id)
    email = models.EmailField()
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=20,
        choices=USER_ROLE_CHOICES,
        default='student'
    )
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profiles'  # Usar la tabla existente de Supabase
        verbose_name = 'Perfil'
        verbose_name_plural = 'Perfiles'

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.get_role_display()}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
