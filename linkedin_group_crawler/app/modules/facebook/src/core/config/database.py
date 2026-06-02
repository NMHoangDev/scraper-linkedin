import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

URL: str = os.getenv("SUPABASE_URL")
KEY: str = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(URL, KEY)