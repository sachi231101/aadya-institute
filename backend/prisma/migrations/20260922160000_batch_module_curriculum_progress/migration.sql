-- AlterTable
ALTER TABLE "BatchModule" ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BatchModule" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "BatchModule" ADD COLUMN "completedById" TEXT;
ALTER TABLE "BatchModule" ADD COLUMN "topicProgress" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "BatchModule_completedById_idx" ON "BatchModule"("completedById");

-- AddForeignKey
ALTER TABLE "BatchModule" ADD CONSTRAINT "BatchModule_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill topicProgress from linked CourseModule.topics (all incomplete)
UPDATE "BatchModule" bm
SET "topicProgress" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'topicId', t.elem ->> 'id',
        'isCompleted', false
      )
      ORDER BY t.ord
    )
    FROM jsonb_array_elements(
      CASE
        WHEN cm."topics" IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(cm."topics"::jsonb) = 'array' THEN cm."topics"::jsonb
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS t(elem, ord)
    WHERE COALESCE(t.elem ->> 'id', '') <> ''
  ),
  '[]'::jsonb
)
FROM "CourseModule" cm
WHERE bm."courseModuleId" = cm.id;
