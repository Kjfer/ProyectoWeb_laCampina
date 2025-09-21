"""
URL configuration for lacampina_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_home(request):
    return JsonResponse({
        'message': 'La Campina API is running',
        'status': 'success',
        'frontend_url': 'http://localhost:5173'
    })

urlpatterns = [
    path('', api_home, name='api_home'),  # Página principal
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    # path('api/profiles/', include('apps.profiles.urls')),
    # path('api/courses/', include('apps.courses.urls')),
    # path('api/assignments/', include('apps.assignments.urls')),
    # path('api/attendance/', include('apps.attendance.urls')),
    # path('api/announcements/', include('apps.announcements.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
