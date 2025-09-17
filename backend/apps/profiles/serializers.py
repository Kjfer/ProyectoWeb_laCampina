from rest_framework import serializers
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Profile model
    """
    full_name = serializers.ReadOnlyField()
    email = serializers.ReadOnlyField()
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = Profile
        fields = (
            'id', 'user_id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'avatar_url', 'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user_id', 'email', 'first_name', 'last_name', 'created_at')


class ProfileCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating profiles
    """
    class Meta:
        model = Profile
        fields = ('user', 'role', 'phone', 'avatar_url')


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating profiles
    """
    class Meta:
        model = Profile
        fields = ('role', 'phone', 'avatar_url', 'is_active')
        
    def validate_role(self, value):
        # Add any role validation logic here
        return value