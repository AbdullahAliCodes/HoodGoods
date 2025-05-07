// backend/src/supabase.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase = createClient(
    'https://euudlgzarnvbsvzlizcu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dWRsZ3phcm52YnN2emxpemN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDg4MzcxOSwiZXhwIjoyMDYwNDU5NzE5fQ.Pz79cmnWhFo9seydAUoW0AZCRg_EPUddDAEZ-vXeYuk' // ONLY use this in backend
  );

  getClient() {
    return this.supabase;
  }
}
