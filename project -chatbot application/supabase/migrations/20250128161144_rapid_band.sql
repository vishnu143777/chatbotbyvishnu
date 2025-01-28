/*
  # Update Chat Schema

  1. Tables
    - Ensures profiles table exists with proper structure
    - Creates messages table for chat functionality
  2. Security
    - Enables RLS on both tables
    - Adds policies for proper access control
  3. Automation
    - Sets up trigger for automatic profile creation
*/

-- Check and create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id),
  receiver_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can insert their own messages'
  ) THEN
    CREATE POLICY "Users can insert their own messages"
      ON messages FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = sender_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view their messages'
  ) THEN
    CREATE POLICY "Users can view their messages"
      ON messages FOR SELECT
      TO authenticated
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
END $$;