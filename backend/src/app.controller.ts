import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AppService } from './app.service';


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {} // ✅ Inject service here

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected() {
    return { message: 'This is a protected route!' };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello(); // ✅ Now TypeScript is happy
  }
}
