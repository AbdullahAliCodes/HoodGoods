// frontend/src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://euudlgzarnvbsvzlizcu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dWRsZ3phcm52YnN2emxpemN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4ODM3MTksImV4cCI6MjA2MDQ1OTcxOX0.gxjFgNkU29UJUAPJ_Mh3B0wayojkpdB6NinEVHBuO9E'
);

export default supabase;
