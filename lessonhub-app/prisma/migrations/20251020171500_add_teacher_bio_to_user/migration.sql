-- Add teacher bio field to users so teachers can share information with students
DO $$
BEGIN
    ALTER TABLE "public"."User"
    ADD COLUMN "teacherBio" TEXT;
EXCEPTION
    WHEN duplicate_column THEN
        -- Column already exists, ignore
        NULL;
END $$;
