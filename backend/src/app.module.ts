import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { ValidationPipe } from '@nestjs/common';// new for cart
import { ProductsModule } from './products/products.module';
import { StoreModule } from './store/store.module';
import { UploadModule } from './upload/upload.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module'; // <<< Import the new module

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 5432,
      username: 'postgres.euudlgzarnvbsvzlizcu',
      password: 'Muzzammil1!',
      database: 'postgres',
      synchronize: false, // set to true if you want TypeORM to auto-create tables (dev only!)
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      ssl: {
        rejectUnauthorized: false, // required for Supabase (self-signed certs)
      },
    }),


    AuthModule,
    StoreModule,
    UploadModule, 
    CartModule,
    ProductsModule,
    PaymentsModule, // Add the StoreModule here
    OrdersModule,
  ],
  

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
