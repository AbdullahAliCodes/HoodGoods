// src/store/store.controller.ts
import {
  Controller, Post, Body, Get, UseGuards, Req,
  Param, Patch, Delete, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
// Import the service method's return type interface if needed elsewhere
import { StoreService, StoreDeliveryDetails } from './store.service';
import { AuthGuard } from '@nestjs/passport'; // Assuming JWT guard

// --- DTO Imports ---
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { GetDeliveryOptionsDto } from './dto/get-delivery-options.dto';
import { UpdateStoreDto } from './dto/update-store.dto'; // <<< Import the DTO for updating the store
// --- End DTO Imports ---

// Entity Imports
import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';

// Interface for Request object with user payload
interface RequestWithUser extends Request {
  user: {
    sub: string; // User ID from JWT subject
  };
}

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  // --- Store Creation ---
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createStore(@Body() createStoreDto: CreateStoreDto, @Req() req: RequestWithUser): Promise<Store> {
    return this.storeService.createStoreWithProducts(createStoreDto, req.user.sub);
  }

  // --- Get User's Own Store ---
  @UseGuards(AuthGuard('jwt'))
  @Get('my-store')
  async getMyStore(@Req() req: RequestWithUser): Promise<{ store: Store; products: Product[] }> {
    return this.storeService.getStoreByUserId(req.user.sub);
  }

  // --- Update User's Own Store Delivery Options ---  <<<< NEW ENDPOINT
  @UseGuards(AuthGuard('jwt'))
  @Patch('my-store/delivery') // Route: PATCH /stores/my-store/delivery
  async updateMyStoreDeliveryOptions(
    @Body() updateStoreDto: UpdateStoreDto, // Use the UpdateStoreDto
    @Req() req: RequestWithUser,
  ): Promise<Store> { // Return the updated store
    const userId = req.user.sub;
    // Call the specific service method for updating the user's store
    return this.storeService.updateStoreDeliveryOptions(userId, updateStoreDto);
  }
  // --- End Update Delivery Options Endpoint ---


  // --- Product Management Endpoints ---
  @UseGuards(AuthGuard('jwt'))
  @Post('products')
  async addProduct(@Body() productDto: CreateProductDto, @Req() req: RequestWithUser): Promise<Product> {
    return this.storeService.addProduct(req.user.sub, productDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('products/:id')
  async updateProduct(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto, @Req() req: RequestWithUser): Promise<Product> {
    return this.storeService.updateProduct(id, updateProductDto, req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser): Promise<void> {
    await this.storeService.deleteProduct(id, req.user.sub);
  }
  // --- End Product Management Endpoints ---


  // --- Endpoint for fetching delivery options for MULTIPLE stores (Keep as is) ---
  @UseGuards(AuthGuard('jwt'))
  @Post('delivery-options')
  async getDeliveryOptions(@Body() getDeliveryOptionsDto: GetDeliveryOptionsDto): Promise<Record<string, StoreDeliveryDetails>> {
    return this.storeService.getDeliveryOptionsForStores(getDeliveryOptionsDto.storeIds);
  }
  // --- End Fetch Multiple Delivery Options ---

} // End Controller