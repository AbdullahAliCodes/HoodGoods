// src/auth/auth.controller.ts
import { Controller, Post, UseGuards, Req, Patch, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('register')
  async registerUser(@Req() req: any) {
    return this.authService.saveUserInfo(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('promote-to-seller')
  async promoteToSeller(@Req() req: any) {
    return this.authService.promoteUserToSeller(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getUserRole(req.user.sub);
  }
}
