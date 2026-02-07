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

decks = Table(
    "decks",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String, nullable=False),
    Column("created_at", DateTime, default=func.now()),
)

cards = Table(
    "cards",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("deck_id", UUID(as_uuid=True), index=True, nullable=False), # ForeignKey would be ideal but keeping it simple for asyncpg setup without full ORM relationship validation
    Column("word", String, nullable=False),
    Column("meaning", String, nullable=False),
    Column("interval", sqlalchemy.Float, default=0.0),
    Column("repetition", sqlalchemy.Integer, default=0),
    Column("ease", sqlalchemy.Float, default=2.5),
    Column("next_review", sqlalchemy.BigInteger, default=0), # Store as timestamp ms
    Column("created_at", DateTime, default=func.now()),
)
