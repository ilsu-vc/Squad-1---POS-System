-- Allow anon read access to shift_records so the tests can read back the inserted clock-ins
DROP POLICY IF EXISTS "Allow anon read shift_records" ON public.shift_records;
CREATE POLICY "Allow anon read shift_records" ON public.shift_records FOR SELECT USING (true);
