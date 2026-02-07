-- Migration: Add logo columns to redes table
-- Execute this on the VPS after pulling the code

ALTER TABLE public.redes 
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "logoVerticalUrl" TEXT;
