/*
# Fix client_code auto-generation trigger

## Problem
The generate_client_code() trigger was producing CLI-0000 for all new inserts,
then hitting a UNIQUE constraint violation on the second insert.

The bug was in the MAX calculation: MAX(suffix) returns 0 when the subquery
has rows with suffix 0 (from the initial seeded values), and LPAD of 0 is '0000',
so the next code was always CLI-0000 (conflicting with itself).

## Fix
Rewrite the trigger to use NEXTVAL pattern via sequence OR a proper MAX+1 approach:
  - Find the maximum numeric suffix from existing client_code values
  - Set new code to MAX + 1, formatted as CLI-NNNN
  - If no existing codes, start from 1

## Result
- First new client after seed: CLI-0003 (Acme=CLI-0001, TechStart=CLI-0002)
- Each subsequent client increments by 1
*/

CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.client_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM clients
    WHERE client_code ~ '^CLI-[0-9]+$';

    NEW.client_code := 'CLI-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
