import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BrowsingPlan(Base):
    __tablename__ = "browsing_plans"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    persona_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("personas.id", ondelete="CASCADE"), index=True
    )
    plan_data: Mapped[str] = mapped_column(Text)  # JSON string
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    executed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
