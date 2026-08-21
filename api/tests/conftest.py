import pytest

from db.memory_store import store


@pytest.fixture(autouse=True)
def reset_memory_store():
    store.reset()
    yield
