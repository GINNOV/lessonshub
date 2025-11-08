DO $$
BEGIN
  ALTER TABLE "CouponCode" ALTER COLUMN "updatedAt" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN
    -- CouponCode not created yet (next migration creates it)
    NULL;
END
$$;
