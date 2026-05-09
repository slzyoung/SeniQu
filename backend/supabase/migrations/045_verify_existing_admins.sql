-- Fix existing admin and artist accounts that were provisioned without email verification
UPDATE users 
SET is_email_verified = true 
WHERE role IN ('admin', 'super_admin', 'artist') 
  AND is_email_verified = false;
