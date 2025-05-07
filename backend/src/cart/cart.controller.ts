import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, HttpStatus, HttpException, ParseIntPipe, Patch } from '@nestjs/common'; // Added Patch, ParseIntPipe
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService, CartItemWithProductDetails } from './cart.service'; // Import interface
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';
import { CartItem } from './entities/cart-item.entity'; // Keep for return types if needed

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req): Promise<CartItemWithProductDetails[]> { // Updated return type
    try {
      // Service now returns the combined data structure
      return await this.cartService.getCart(req.user.sub);
    } catch (error) {
       console.error("Controller Error: Failed to fetch cart:", error);
       // Use existing exceptions from service or throw a generic one
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to fetch cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async addToCart(@Req() req, @Body() dto: CreateCartItemDto): Promise<CartItem> { // DTO is simpler now
    try {
      // Service now handles finding product and adding/updating
      // Consider what should be returned: the basic CartItem or refetch the full details?
      // Returning basic CartItem for now. Frontend should rely on getCart for full view.
      return await this.cartService.addToCart(req.user.sub, dto);
    } catch (error) {
        console.error("Controller Error: Failed to add to cart:", error);
        if (error instanceof HttpException) throw error; // Re-throw known HTTP exceptions (like NotFoundException)
        throw new HttpException('Failed to add item to cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('sync')
  async syncCart(@Req() req, @Body() dto: SyncCartDto) { // DTO is simpler now
    try {
      await this.cartService.syncCart(req.user.sub, dto.items);
      return { message: 'Cart synced successfully' };
    } catch (error) {
       console.error("Controller Error: Failed to sync cart:", error);
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to sync cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Changed to PATCH for partial update, use ParseIntPipe for productId
  @Patch(':productId')
  async updateCartItem(
    @Req() req,
    @Param('productId', ParseIntPipe) productId: number, // Parse string param to number
    @Body() dto: UpdateCartItemDto
  ): Promise<CartItem> {
    try {
      return await this.cartService.updateCartItem(req.user.sub, productId, dto);
    } catch (error) {
      console.error("Controller Error: Failed to update cart item:", error);
      if (error instanceof HttpException) throw error; // Re-throw NotFoundException etc.
      throw new HttpException('Failed to update cart item', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Use ParseIntPipe for productId
  @Delete(':productId')
  async removeFromCart(
    @Req() req,
    @Param('productId', ParseIntPipe) productId: number // Parse string param to number
  ) {
    try {
      const success = await this.cartService.removeFromCart(req.user.sub, productId);
      if (!success) {
        // Service returns false if not found, controller translates to 404
        throw new HttpException('Item not found in cart', HttpStatus.NOT_FOUND);
      }
      // Use 204 No Content for successful deletion with no body
      // Or return a simple message with 200 OK
      return { message: 'Item removed from cart' };
      // res.status(HttpStatus.NO_CONTENT).send(); // Alternative using @Res
    } catch (error) {
      console.error("Controller Error: Failed to remove item:", error);
      if (error instanceof HttpException) throw error; // Re-throw known exceptions
      throw new HttpException('Failed to remove item from cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete() // Endpoint to clear the entire cart
  async clearCart(@Req() req) {
    try {
      const success = await this.cartService.clearCart(req.user.sub);
      if (!success) {
        // This might mean the cart was already empty, which isn't strictly an error.
        // Depending on desired behavior, you could return 200 OK or 404.
        // Let's return 200 OK with a message indicating it might have been empty.
         return { message: 'Cart cleared successfully (or was already empty)' };
        // Or throw 404 if you want to signal "nothing to clear":
        // throw new HttpException('Cart is already empty', HttpStatus.NOT_FOUND);
      }
      return { message: 'Cart cleared successfully' };
      // Or use 204 No Content
      // res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
       console.error("Controller Error: Failed to clear cart:", error);
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to clear cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}