-- Add CHECK constraint: each SlotLock must belong to exactly one of booking or hold
ALTER TABLE "SlotLock" ADD CONSTRAINT slotlock_owner_chk CHECK ((("bookingId" IS NOT NULL)::int + ("holdId" IS NOT NULL)::int) = 1);
