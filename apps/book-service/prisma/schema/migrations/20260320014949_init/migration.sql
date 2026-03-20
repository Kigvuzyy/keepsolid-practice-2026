-- CreateEnum
CREATE TYPE "UploadIntentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "BookVectorizationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BookSearchSuggestionKind" AS ENUM ('BOOK_TITLE', 'AUTHOR');

-- CreateTable
CREATE TABLE "upload_intents" (
    "id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" "UploadIntentStatus" NOT NULL DEFAULT 'PENDING',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "expected_content_type" TEXT,
    "expected_size_bytes" BIGINT,
    "actual_content_type" TEXT,
    "actual_size_bytes" BIGINT,
    "etag" TEXT,
    "presigned_expires_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" BIGINT NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'UPLOADED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "authors" TEXT[],
    "cover_bucket" TEXT,
    "cover_object_key" TEXT,
    "failed_reason" TEXT,
    "upload_intent_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_chapters" (
    "id" BIGINT NOT NULL,
    "book_id" BIGINT NOT NULL,
    "html" TEXT NOT NULL,
    "external_chapter_id" TEXT NOT NULL,
    "chapter_index" INTEGER NOT NULL,
    "title" TEXT,
    "bucket" TEXT,
    "object_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_vectorization_progress" (
    "book_id" BIGINT NOT NULL,
    "status" "BookVectorizationStatus" NOT NULL DEFAULT 'PENDING',
    "expected_chapters_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_vectorization_progress_pkey" PRIMARY KEY ("book_id")
);

-- CreateTable
CREATE TABLE "book_vectorized_chapters" (
    "id" BIGINT NOT NULL,
    "book_id" BIGINT NOT NULL,
    "external_chapter_id" TEXT NOT NULL,
    "chunks_count" INTEGER NOT NULL,
    "vectorized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_vectorized_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_search_suggestions" (
    "id" BIGINT NOT NULL,
    "book_id" BIGINT NOT NULL,
    "kind" "BookSearchSuggestionKind" NOT NULL,
    "source_key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalized_value" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_search_suggestions_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE INDEX "upload_intents_user_id_status_created_at_idx" ON "upload_intents"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "upload_intents_status_presigned_expires_at_idx" ON "upload_intents"("status", "presigned_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "upload_intents_bucket_object_key_key" ON "upload_intents"("bucket", "object_key");

-- CreateIndex
CREATE UNIQUE INDEX "books_upload_intent_id_key" ON "books"("upload_intent_id");

-- CreateIndex
CREATE INDEX "books_owner_id_status_created_at_idx" ON "books"("owner_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "books_status_updated_at_idx" ON "books"("status", "updated_at");

-- CreateIndex
CREATE INDEX "book_chapters_book_id_chapter_index_idx" ON "book_chapters"("book_id", "chapter_index");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapters_book_id_external_chapter_id_key" ON "book_chapters"("book_id", "external_chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapters_book_id_chapter_index_key" ON "book_chapters"("book_id", "chapter_index");

-- CreateIndex
CREATE INDEX "book_vectorization_progress_status_updated_at_idx" ON "book_vectorization_progress"("status", "updated_at");

-- CreateIndex
CREATE INDEX "book_vectorized_chapters_book_id_vectorized_at_idx" ON "book_vectorized_chapters"("book_id", "vectorized_at");

-- CreateIndex
CREATE UNIQUE INDEX "book_vectorized_chapters_book_id_external_chapter_id_key" ON "book_vectorized_chapters"("book_id", "external_chapter_id");

-- CreateIndex
CREATE INDEX "book_search_suggestions_normalized_value_trgm_idx" ON "book_search_suggestions" USING GIN ("normalized_value" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "book_search_suggestions_book_id_kind_idx" ON "book_search_suggestions"("book_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "book_search_suggestions_book_id_source_key_key" ON "book_search_suggestions"("book_id", "source_key");

-- CreateIndex
CREATE INDEX "outbox_events_occurred_at_idx" ON "outbox_events"("occurred_at");

-- CreateIndex
CREATE INDEX "outbox_events_correlation_id_idx" ON "outbox_events"("correlation_id");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "outbox_events"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "outbox_events_type_idx" ON "outbox_events"("type");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_upload_intent_id_fkey" FOREIGN KEY ("upload_intent_id") REFERENCES "upload_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_vectorization_progress" ADD CONSTRAINT "book_vectorization_progress_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_vectorized_chapters" ADD CONSTRAINT "book_vectorized_chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_search_suggestions" ADD CONSTRAINT "book_search_suggestions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'dbz_publication') THEN
        CREATE PUBLICATION dbz_publication FOR TABLE public.outbox_events;
    END IF;
END $$;
