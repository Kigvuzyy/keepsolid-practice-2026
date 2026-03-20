-- CreateEnum
CREATE TYPE "BookVectorizationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "spec_version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "instance" TEXT NOT NULL,
    "service_version" TEXT,
    "correlation_id" UUID,
    "causation_id" UUID,
    "trace_parent" TEXT,
    "trace_state" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_outbox_events" (
    "event_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_outbox_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "book_vectorization_states" (
    "book_id" BIGINT NOT NULL,
    "status" "BookVectorizationStatus" NOT NULL DEFAULT 'PENDING',
    "expected_chapters_count" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_vectorization_states_pkey" PRIMARY KEY ("book_id")
);

-- CreateTable
CREATE TABLE "book_vectorized_chapters" (
    "id" BIGINT NOT NULL,
    "book_id" BIGINT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "chapter_index" INTEGER NOT NULL,
    "chunks_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_vectorized_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_events_occurred_at_idx" ON "outbox_events"("occurred_at");

-- CreateIndex
CREATE INDEX "outbox_events_correlation_id_idx" ON "outbox_events"("correlation_id");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "outbox_events"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "outbox_events_type_idx" ON "outbox_events"("type");

-- CreateIndex
CREATE INDEX "book_vectorization_states_status_idx" ON "book_vectorization_states"("status");

-- CreateIndex
CREATE INDEX "book_vectorized_chapters_book_id_idx" ON "book_vectorized_chapters"("book_id");

-- CreateIndex
CREATE INDEX "book_vectorized_chapters_book_id_chapter_index_idx" ON "book_vectorized_chapters"("book_id", "chapter_index");

-- CreateIndex
CREATE UNIQUE INDEX "book_vectorized_chapters_book_id_chapter_id_key" ON "book_vectorized_chapters"("book_id", "chapter_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'dbz_publication') THEN
        CREATE PUBLICATION dbz_publication FOR TABLE public.outbox_events;
    END IF;
END $$;
