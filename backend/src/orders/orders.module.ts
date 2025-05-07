// src/orders/orders.module.ts

import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule
import { OrdersService } from './orders.service'; // Import the service
import { OrdersController } from './orders.controller'; // Import the controller

// Import all entities used within this module or whose repositories are needed
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { SellerOrderItem } from './entities/seller-order-item.entity';

// Import entities from other modules that OrdersService interacts with
// This makes their repositories available via TypeOrmModule.forFeature
import { Product } from '../products/entities/product.entity'; // Adjust path
import { Store } from '../store/entities/store.entity';       // Adjust path
import { CartItem } from '../cart/entities/cart-item.entity'; // Adjust path

// Import AuthModule if needed for the AuthGuard scope
// Often required if AuthModule exports Passport strategy/guard setup
import { AuthModule } from '../auth/auth.module';             // Adjust path

@Module({
  imports: [
    // Make repositories for these entities available within the OrdersModule scope
    TypeOrmModule.forFeature([
      Order,            // Main order entity
      SellerOrder,      // Seller order entity
      SellerOrderItem,  // Order item entity
      // Entities needed by OrdersService for lookups/updates/deletes:
      Product,
      Store,
      CartItem,
      // User entity is related but its repository might not be directly needed
      // if only the ID is used from the request object. Include if User repo is injected.
    ]),
    // Import AuthModule to ensure Passport/JWT strategy configured via it is available
    // for the AuthGuard used in OrdersController.
    AuthModule,
    // If OrdersService directly injected services from other modules (e.g., ProductsService),
    // you would import those modules here too (e.g., ProductsModule).
    // In our case, OrdersService uses repositories/queryRunner directly.
  ],
  controllers: [OrdersController], // Declare the controller belonging to this module
  providers: [OrdersService   ,Logger],      // Declare the service belonging to this module
  // exports: [OrdersService] // Only needed if other modules need to inject OrdersService directly
})
export class OrdersModule {}