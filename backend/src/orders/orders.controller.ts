// src/orders/orders.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  BadRequestException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { InternalServerErrorException, ForbiddenException } from '@nestjs/common';
// *** Import the DTO ***
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Define interface for request object after authentication
interface AuthenticatedRequest extends Request {
  user: {
    sub: string; // Auth0 User ID
    [key: string]: any;
  };
}

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  // --- Route for Buyers to Create Orders ---
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Order> {
    // ... (implementation) ...
     this.logger.log('--- Controller: /orders/create endpoint hit ---');
    const buyerUserId = req.user?.sub;
    this.logger.log(`Controller: Extracted buyerUserId: ${buyerUserId}`);
    if (!buyerUserId) {
      this.logger.error('Controller: FAILED to extract buyerUserId from req.user.sub');
      throw new InternalServerErrorException('Authenticated user ID could not be determined.');
    }
    this.logger.debug(`Controller: Received DTO: ${JSON.stringify(createOrderDto)}`);
    try {
      this.logger.log(`Controller: Attempting to call OrdersService.createOrder for user: ${buyerUserId}`);
      const createdOrder = await this.ordersService.createOrder(createOrderDto, buyerUserId);
      this.logger.log(`Controller: OrdersService.createOrder SUCCEEDED. Order ID: ${createdOrder.orderId}`);
      return createdOrder;
    } catch (error) {
      this.logger.error(`Controller: Error received FROM OrdersService during creation for user ${buyerUserId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Route for Buyers to Get Their Own Orders ---
  @Get('my-orders') // Route: GET /orders/my-orders
  async getMyOrders(
    @Req() req: AuthenticatedRequest,
  ): Promise<Order[]> { // Returns an array of the main Order objects
    const buyerUserId = req.user?.sub;
    this.logger.log(`--- Controller: /orders/my-orders endpoint hit by user: ${buyerUserId} ---`);
    if (!buyerUserId) {
      this.logger.error('Controller: FAILED to extract buyerUserId from req.user.sub for getMyOrders');
      throw new InternalServerErrorException('Authenticated user ID could not be determined.');
    }
    try {
      // Call the new service method for finding buyer orders
      return await this.ordersService.findBuyerOrders(buyerUserId);
    } catch (error) {
       this.logger.error(`Controller: Error received FROM OrdersService during getMyOrders for user ${buyerUserId}: ${error.message}`, error.stack);
       throw error; // Re-throw service errors
    }
  }

  // --- Route for Sellers to Get Their Orders ---
  @Get('my-seller-orders')
  async getMySellerOrders(
    @Req() req: AuthenticatedRequest,
  ): Promise<SellerOrder[]> {
    // ... (implementation) ...
      const sellerUserId = req.user?.sub;
    this.logger.log(`--- Controller: /orders/my-seller-orders endpoint hit by user: ${sellerUserId} ---`);
    if (!sellerUserId) {
      this.logger.error('Controller: FAILED to extract sellerUserId from req.user.sub for getMySellerOrders');
      throw new InternalServerErrorException('Authenticated user ID could not be determined.');
    }
    try {
      return await this.ordersService.findSellerOrders(sellerUserId);
    } catch (error) {
       this.logger.error(`Controller: Error received FROM OrdersService during getMySellerOrders for user ${sellerUserId}: ${error.message}`, error.stack);
       throw error; // Re-throw service errors
    }
  }

  // --- Route for Seller Earnings ---
  @Get('my-seller-earnings')
  async getMySellerEarnings(
      @Req() req: AuthenticatedRequest,
      @Query('status') status?: string
  ): Promise<{ totalEarnings: number }> {
    // ... (implementation) ...
      const sellerUserId = req.user?.sub;
      this.logger.log(`--- Controller: /orders/my-seller-earnings endpoint hit by user: ${sellerUserId}, status filter: ${status} ---`);
      if (!sellerUserId) { throw new InternalServerErrorException('Authenticated user ID could not be determined.'); }
      // Call the service method, passing the optional status
      return this.ordersService.calculateSellerEarnings(sellerUserId, status);
  }

  // --- Route for Seller Updating Status ---
  @Patch('seller/:id/status')
  async updateSellerOrderStatus(
      @Req() req: AuthenticatedRequest,
      @Param('id', ParseIntPipe) sellerOrderId: number,
      // *** CORRECTED: Use the actual DTO type for validation ***
      @Body() updateOrderStatusDto: UpdateOrderStatusDto
  ): Promise<SellerOrder> {
      const sellerUserId = req.user?.sub;
      // *** REMOVED: Unnecessary extraction and validation ***
      // const newStatus = updateOrderStatusDto.status;
      this.logger.log(`--- Controller: PATCH /orders/seller/${sellerOrderId}/status endpoint hit by user: ${sellerUserId} with status: ${updateOrderStatusDto.status} ---`);

      if (!sellerUserId) {
          throw new InternalServerErrorException('Authenticated user ID could not be determined.');
      }

      // DTO validation (including IsIn check) is handled by ValidationPipe

      // *** CORRECTED: Pass the full DTO object to the service ***
      try {
        return await this.ordersService.updateSellerOrderStatus(sellerOrderId, sellerUserId, updateOrderStatusDto);
      } catch (error) {
         this.logger.error(`Controller: Error received FROM OrdersService during updateSellerOrderStatus for sellerOrder ${sellerOrderId} by user ${sellerUserId}: ${error.message}`, error.stack);
         throw error; // Re-throw service errors (like NotFoundException)
      }
  }

} // End OrdersController class
