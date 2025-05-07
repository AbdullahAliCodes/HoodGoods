// --- payments.module.ts ---
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { AuthModule } from '../auth/auth.module'; // Assuming you have AuthModule
// Import TypeOrmModule if interacting with Order entity
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Order } from './entities/order.entity'; // Example Order entity

@Module({
  imports: [
    ConfigModule, // *** Add ConfigModule here ***
    AuthModule,
    // TypeOrmModule.forFeature([Order]) // Import if using Order entity
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}