-- Migration: add description and service_category to clients
-- Run in Supabase SQL Editor

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS service_category text;
