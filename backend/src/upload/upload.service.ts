// backend/src/upload/upload.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class UploadService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadImage(file: Express.Multer.File): Promise<any> {
    const supabase = this.supabaseService.getClient();

    const filePath = `uploads/${Date.now()}-${file.originalname}`;
    const { data, error } = await supabase.storage
      .from('images') // your bucket name
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw new Error(error.message);

    return {
      path: data.path,
      url: `https://euudlgzarnvbsvzlizcu.supabase.co/storage/v1/object/public/images/${data.path}`,
    };
  }
}
