from core.config import settings
from db.memory_store import store as memory_store


def get_store():
    # Cloud path: when Supabase env is present, repositories talk to Postgres.
    # Tests and local demo use MemoryStore so CI has no single-machine DB.
    if settings.use_supabase:
        from db.supabase_store import SupabaseStore

        return SupabaseStore()
    return memory_store
