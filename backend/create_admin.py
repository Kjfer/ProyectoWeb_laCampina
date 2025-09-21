from supabase import create_client

# Configuración de Supabase
SUPABASE_URL = "https://dvucxenjdfxxqtekhqfg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWN4ZW5qZGZ4eHF0ZWtocWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEyNzk4OCwiZXhwIjoyMDczNzAzOTg4fQ.EQqhYiOCG_q86_PkqxnGOa5w-X5SjgE1-YM5F6QVU3M"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_admin_user():
    # Datos del usuario administrador
    admin_email = "admin@lacampina.edu.co"
    admin_password = "admin123"
    
    try:
        # Crear usuario en Supabase Auth
        auth_response = supabase.auth.admin.create_user({
            "email": admin_email,
            "password": admin_password,
            "email_confirm": True
        })
        
        if auth_response.user:
            print(f"Usuario creado exitosamente: {auth_response.user.id}")
            
            # Crear perfil en la tabla profiles
            profile_data = {
                "id": auth_response.user.id,
                "user_id": auth_response.user.id,
                "email": admin_email,
                "first_name": "Administrador",
                "last_name": "Sistema",
                "role": "admin",
                "is_active": True
            }
            
            profile_response = supabase.table('profiles').insert(profile_data).execute()
            
            if profile_response.data:
                print("Perfil de administrador creado exitosamente")
                print(f"Email: {admin_email}")
                print(f"Password: {admin_password}")
                print("Rol: admin")
            else:
                print("Error al crear el perfil:", profile_response)
        else:
            print("Error al crear el usuario:", auth_response)
            
    except Exception as e:
        print(f"Error: {e}")
        # Si el usuario ya existe, solo actualizamos el perfil
        print("Intentando crear solo el perfil...")
        try:
            # Buscar el usuario por email
            users = supabase.auth.admin.list_users()
            existing_user = None
            
            for user in users:
                if user.email == admin_email:
                    existing_user = user
                    break
            
            if existing_user:
                # Crear/actualizar perfil
                profile_data = {
                    "id": existing_user.id,
                    "user_id": existing_user.id,
                    "email": admin_email,
                    "first_name": "Administrador",
                    "last_name": "Sistema", 
                    "role": "admin",
                    "is_active": True
                }
                
                # Intentar insertar, si falla, actualizar
                try:
                    profile_response = supabase.table('profiles').insert(profile_data).execute()
                    print("Perfil creado exitosamente")
                except:
                    profile_response = supabase.table('profiles').update(profile_data).eq('user_id', existing_user.id).execute()
                    print("Perfil actualizado exitosamente")
                
                print(f"Email: {admin_email}")
                print(f"Password: {admin_password}")
                print("Rol: admin")
            else:
                print("No se encontró el usuario")
        except Exception as inner_e:
            print(f"Error interno: {inner_e}")

if __name__ == "__main__":
    create_admin_user()