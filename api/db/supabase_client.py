from core.config import settings
from db.memory_store import store as memory_store

_supabase_store = None


def get_store():
    # Cloud path: when Supabase env is present, repositories talk to Postgres.
    # Tests and local demo use MemoryStore so CI has no single-machine DB.
    global _supabase_store
    if settings.use_supabase:
        if _supabase_store is None:
            from db.supabase_store import SupabaseStore

            _supabase_store = SupabaseStore()
        return _supabase_store
    return memory_store
