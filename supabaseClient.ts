import { createClient } from '@supabase/supabase-js';

// Credential provided by user
const supabaseUrl = 'https://qtctkhkykkwntecxgezs.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0Y3RraGt5a2t3bnRlY3hnZXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Mzc5MzEsImV4cCI6MjA3OTIxMzkzMX0.JYwNRCuadt34wvKpIwjQjvfkMVr73iCphMnZ3oc-xFM';

// Export a flag to check if DB is connected
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseKey.length > 0;

// Initialize the Supabase client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : { 
      // Mock implementation to prevent crashes if keys are somehow missing in future
      from: () => ({ 
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null })
      }) 
    } as any;

// This is the code block that represents the suggested code change:
// https://docs.google.com/spreadsheets/d/1xVSJlNilOKu2zi-R1Jeuv__buGkzbECSWef0MSLr4oM/edit
