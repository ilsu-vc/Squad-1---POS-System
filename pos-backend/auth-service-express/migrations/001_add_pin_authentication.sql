-- Migration: Add PIN authentication support
-- SCRUM-386, SCRUM-387: PIN authentication with failed attempt tracking

-- Add PIN column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_failed_attempt TIMESTAMP WITH TIME ZONE;

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_pin_enabled ON user_profiles(pin_enabled) WHERE pin_enabled = TRUE;

-- Create index for locked accounts
CREATE INDEX IF NOT EXISTS idx_user_profiles_locked_until ON user_profiles(locked_until) WHERE locked_until IS NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN user_profiles.pin_hash IS 'Hashed PIN for cashier quick login (bcrypt/argon2)';
COMMENT ON COLUMN user_profiles.pin_enabled IS 'Whether PIN authentication is enabled for this user';
COMMENT ON COLUMN user_profiles.failed_login_attempts IS 'Counter for failed login attempts (resets on successful login)';
COMMENT ON COLUMN user_profiles.locked_until IS 'Timestamp until which the account is locked due to failed attempts';
COMMENT ON COLUMN user_profiles.last_failed_attempt IS 'Timestamp of the last failed login attempt';

-- Create function to reset failed attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called after successful authentication
  -- Reset counters when user successfully logs in
  NEW.failed_login_attempts := 0;
  NEW.locked_until := NULL;
  NEW.last_failed_attempt := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment failed attempts
CREATE OR REPLACE FUNCTION increment_failed_login_attempts(user_id_param UUID)
RETURNS TABLE(
  attempts INTEGER,
  is_locked BOOLEAN,
  locked_until_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  max_attempts INTEGER := 3;
  lockout_duration INTERVAL := '15 minutes';
  current_attempts INTEGER;
  current_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current attempts
  SELECT failed_login_attempts, user_profiles.locked_until
  INTO current_attempts, current_locked_until
  FROM user_profiles
  WHERE id = user_id_param;

  -- Check if already locked and lock hasn't expired
  IF current_locked_until IS NOT NULL AND current_locked_until > NOW() THEN
    RETURN QUERY SELECT current_attempts, TRUE, current_locked_until;
    RETURN;
  END IF;

  -- Increment failed attempts
  current_attempts := current_attempts + 1;

  -- Check if we should lock the account
  IF current_attempts >= max_attempts THEN
    current_locked_until := NOW() + lockout_duration;
    
    UPDATE user_profiles
    SET 
      failed_login_attempts = current_attempts,
      locked_until = current_locked_until,
      last_failed_attempt = NOW()
    WHERE id = user_id_param;

    RETURN QUERY SELECT current_attempts, TRUE, current_locked_until;
  ELSE
    UPDATE user_profiles
    SET 
      failed_login_attempts = current_attempts,
      last_failed_attempt = NOW()
    WHERE id = user_id_param;

    RETURN QUERY SELECT current_attempts, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit log table for authentication attempts
CREATE TABLE IF NOT EXISTS auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  attempt_type VARCHAR(50) NOT NULL, -- 'pin', 'password', 'email'
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for auth attempts
CREATE INDEX IF NOT EXISTS idx_auth_attempts_user_id ON auth_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created_at ON auth_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_success ON auth_attempts(success);

-- Add comment
COMMENT ON TABLE auth_attempts IS 'Audit log for all authentication attempts (successful and failed)';
