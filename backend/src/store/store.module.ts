// src/store/store.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/user.entity';
import { Store } from './entities/store.entity'; // Import the new Store entity

@Module({
  imports: [
    // Add Store to the list of entities for this module
    TypeOrmModule.forFeature([Product, User, Store]),
  ],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}