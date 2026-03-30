import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lkvbpsvvtojompxuhncu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdmJwc3Z2dG9qb21weHVobmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDEzMjksImV4cCI6MjA4NzUxNzMyOX0.LgNJLpukVddoLeUPddEeHreV9QSqBewWHpDFWz1YY-s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
