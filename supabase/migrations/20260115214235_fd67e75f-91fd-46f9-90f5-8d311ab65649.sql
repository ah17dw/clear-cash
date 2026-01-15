-- Add couples_mode column to renewals table
ALTER TABLE public.renewals 
ADD COLUMN couples_mode boolean NOT NULL DEFAULT false;