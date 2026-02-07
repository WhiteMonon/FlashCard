import sqlalchemy
from sqlalchemy import create_engine, MetaData, Table, Column, String, LargeBinary, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

metadata = MetaData()

audio_cache = Table(
    "audio_cache",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("word", String, index=True, nullable=False),
    Column("voice", String, index=True, nullable=False),
    Column("audio_data", LargeBinary, nullable=False),
    Column("created_at", DateTime, default=func.now()),
)
