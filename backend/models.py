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
    Column("deck_id", UUID(as_uuid=True), index=True, nullable=False),
    Column("word", String, nullable=False),
    Column("meaning", String, nullable=False),
    Column("ipa", String, nullable=True),
    Column("stability", sqlalchemy.Float, default=0.0),
    Column("difficulty", sqlalchemy.Float, default=0.0),
    Column("state", sqlalchemy.Integer, default=0),
    Column("reps", sqlalchemy.Integer, default=0),
    Column("step", sqlalchemy.Integer, default=0),
    Column("last_review", sqlalchemy.BigInteger, default=0),
    Column("next_review", sqlalchemy.BigInteger, default=0),  # Timestamp ms
    Column("created_at", DateTime, default=func.now()),
)
