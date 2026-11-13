"""Local persistence boundary. SQLite WAL keeps reads independent of short writes."""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def default_state():
    return {"schemaVersion": 1, "progress": {}, "sessions": [], "game": None,
            "settings": {"pieces": "neo-wood", "board": "sage", "sounds": True, "motion": True}}


def validate_state(state):
    if not isinstance(state, dict) or state.get("schemaVersion") != 1:
        raise ValueError("Unsupported backup format.")
    for key, kind in (("progress", dict), ("sessions", list), ("settings", dict)):
        if not isinstance(state.get(key), kind):
            raise ValueError(f"Invalid {key} data.")
    if not all(isinstance(value, dict) for value in state['progress'].values()):
        raise ValueError('Invalid lesson progress.')
    if not all(isinstance(item, dict) and all(isinstance(item.get(key), str) for key in ('id', 'title', 'date')) for item in state['sessions']):
        raise ValueError('Invalid session history.')
    if len(state["sessions"]) > 5000 or len(json.dumps(state)) > 1_000_000:
        raise ValueError("This backup exceeds the storage limit.")
    if state.get("game") is not None and not isinstance(state["game"], dict):
        raise ValueError("Invalid saved game.")
    if state.get('game') is not None and not isinstance(state['game'].get('pgn'), str):
        raise ValueError('Invalid game notation.')
    return state


class Conflict(Exception):
    pass


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, data TEXT NOT NULL)")
            db.execute("INSERT OR IGNORE INTO workspace VALUES (1, 0, ?)", (json.dumps(default_state()),))

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            db.execute("PRAGMA busy_timeout=10000")
            with db:
                yield db
        finally:
            db.close()

    def read(self):
        with self.connect() as db:
            revision, data = db.execute("SELECT revision, data FROM workspace WHERE id=1").fetchone()
        return {"revision": revision, "state": json.loads(data)}

    def save(self, state, expected_revision):
        validate_state(state)
        with self.connect() as db:
            result = db.execute("UPDATE workspace SET revision=revision+1, data=? WHERE id=1 AND revision=?",
                                (json.dumps(state), expected_revision))
            if result.rowcount != 1:
                raise Conflict("Another tab saved changes. Export this tab's data, then reload to use the latest progress.")
        return expected_revision + 1
