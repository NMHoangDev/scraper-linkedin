import os
import secrets
import string
import sys

import bcrypt
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(".env")
load_dotenv(".env.local", override=True)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined")
    sys.exit(1)

supabase: Client = create_client(url, key)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def gen_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main():
    email = "leader.demo@markeeai.com"
    name = "Leader Demo"
    password = gen_password()
    hashed = hash_password(password)

    existing = supabase.table("app_users").select("id").eq("email", email).execute()
    if existing.data:
        supabase.table("app_users").update(
            {"password": hashed, "role": "leader", "is_active": True, "name": name}
        ).eq("email", email).execute()
        print("Updated existing account.")
    else:
        supabase.table("app_users").insert(
            {
                "email": email,
                "password": hashed,
                "name": name,
                "role": "leader",
                "is_active": True,
            }
        ).execute()
        print("Created new account.")

    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Target: {url}")


if __name__ == "__main__":
    main()
