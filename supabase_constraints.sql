-- ==========================================
-- UNIQUE CONSTRAINTS FOR WORKLY HRIS
-- ==========================================
-- Jalankan script ini di Supabase SQL Editor
-- untuk menambahkan unique constraints yang
-- dibutuhkan oleh frontend

-- ==========================================
-- 1. EMPLOYEE SCHEDULES - UNIQUE(user_id, date)
-- ==========================================
-- Dibutuhkan oleh Shift.tsx: onConflict: "user_id,date"

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employee_schedules_user_id_date_unique'
  ) THEN
    ALTER TABLE public.employee_schedules 
    ADD CONSTRAINT employee_schedules_user_id_date_unique 
    UNIQUE (user_id, date);
    
    RAISE NOTICE 'Constraint employee_schedules_user_id_date_unique berhasil ditambahkan.';
  ELSE
    RAISE NOTICE 'Constraint employee_schedules_user_id_date_unique sudah ada.';
  END IF;
END $$;

-- ==========================================
-- 2. PAYROLLS - UNIQUE(user_id, period_month, period_year)
-- ==========================================
-- Dibutuhkan oleh Payroll.tsx: onConflict: "user_id,period_month,period_year"

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payrolls_user_id_period_unique'
  ) THEN
    ALTER TABLE public.payrolls 
    ADD CONSTRAINT payrolls_user_id_period_unique 
    UNIQUE (user_id, period_month, period_year);
    
    RAISE NOTICE 'Constraint payrolls_user_id_period_unique berhasil ditambahkan.';
  ELSE
    RAISE NOTICE 'Constraint payrolls_user_id_period_unique sudah ada.';
  END IF;
END $$;
