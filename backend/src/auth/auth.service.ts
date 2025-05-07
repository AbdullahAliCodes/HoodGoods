// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async saveUserInfo(userInfo: any) {
    const userID = userInfo.sub;

    let user = await this.userRepository.findOne({ where: { userID } });

    if (!user) {
      user = this.userRepository.create({
        userID,
        role: 'buyer',
      });
      await this.userRepository.save(user);
    }

    return { message: 'User registered or already exists' };
  }


  async promoteUserToSeller(userInfo: any) {
    const userID = userInfo.sub;

    const user = await this.userRepository.findOne({ where: { userID } });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'seller') {
      return { message: 'User is already a seller' };
    }

    user.role = 'seller';
    await this.userRepository.save(user);

    return { message: 'User promoted to seller successfully' };
  }
  

  async getUserRole(userID: string) {
    const user = await this.userRepository.findOne({ where: { userID } });

    if (!user) {
      throw new Error('User not found');
    }

    return { role: user.role };
  }
}
