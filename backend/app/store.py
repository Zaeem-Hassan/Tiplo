from __future__ import annotations

import uuid
from datetime import datetime, timezone

from .scoring import SessionState


class InMemoryStore:
    def __init__(self):
        self.sessions: dict[str, SessionState] = {}

    def new_id(self, prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex[:10]}"

    @staticmethod
    def utc_now() -> str:
        return datetime.now(timezone.utc).isoformat()


store = InMemoryStore()