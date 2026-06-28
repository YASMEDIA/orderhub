ALTER TABLE "Product"
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

UPDATE "Product"
SET "position" = ranked."position"
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt" ASC, "name" ASC) - 1 AS "position"
  FROM "Product"
) AS ranked
WHERE "Product"."id" = ranked."id";
