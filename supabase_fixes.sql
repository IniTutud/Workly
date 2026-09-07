-- ==========================================
-- 1. LEAVE REQUEST - MONTHLY RESET BUG
-- ==========================================
-- This script uses pg_cron to schedule a monthly reset of used_leave.
-- Make sure pg_cron is enabled in your Supabase Dashboard (Database -> Extensions).

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION reset_monthly_leave_balance()
RETURNS void AS $$
BEGIN
  -- Change 'users' to your actual table name if different (e.g., 'employees' or 'profiles')
  -- Change 'used_leave' to your actual column name
  UPDATE users 
  SET used_leave = 0; 
END;
$$ LANGUAGE plpgsql;

-- Schedule to run at 00:00 on the 1st day of every month
SELECT cron.schedule(
  'reset-leave-monthly', 
  '0 0 1 * *',           
  $$SELECT reset_monthly_leave_balance()$$
);

-- ==========================================
-- 2. SHIFT EXCHANGE - SCHEDULE NOT UPDATING
-- ==========================================
-- This trigger automatically swaps schedules in the database when an admin approves an exchange.

CREATE OR REPLACE FUNCTION handle_shift_exchange_approval()
RETURNS trigger AS $$
BEGIN
  -- When status changes to 'Approved'
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    
    -- Update Requester's schedule to take Target's shift
    -- Adjust 'schedules' and column names to match your schema
    UPDATE schedules 
    SET shift_id = NEW.target_shift_id
    WHERE id = NEW.requester_schedule_id;

    -- Update Target's schedule to take Requester's shift
    UPDATE schedules 
    SET shift_id = NEW.requester_shift_id
    WHERE id = NEW.target_schedule_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the trigger to the shift_exchanges table (Replace with your actual table name)
CREATE TRIGGER on_shift_exchange_approved
AFTER UPDATE ON shift_exchanges
FOR EACH ROW
EXECUTE FUNCTION handle_shift_exchange_approval();
