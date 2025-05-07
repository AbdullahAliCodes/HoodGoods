// cart.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
// Import the updated interface definition from the service file
import { CartService, CartItemWithProductDetails } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';
// Import base CartItem entity for methods that return it
import { CartItem } from './entities/cart-item.entity';
import { HttpException, HttpStatus, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';

// --- MOCK DATA (Updated based on latest CartService) ---

const mockUserId = 'user-123';
const mockProductId1 = 1;
const mockProductId2 = 2;
const mockStoreId1 = 'store-abc'; // Example store ID as string
const mockStoreId2 = 'store-xyz'; // Example store ID as string

// Define mock data conforming to the NEW (flattened) CartItemWithProductDetails interface
const mockCartItemWithDetails1: CartItemWithProductDetails = {
  cartID: 10, // Assuming CartItem has cartID from getCart implementation
  userId: mockUserId,
  productId: mockProductId1,
  quantity: 2,
  // Flattened product details:
  productName: 'Test Product 1 Updated',
  productPrice: 10.99,
  imageUrl: 'http://example.com/img1-updated.jpg',
  availableQuantity: 100, // Example available stock
  storeName: 'Awesome Store A', // Example store name
  storeId: mockStoreId1,    // Example store ID
};

const mockCartItemWithDetails2: CartItemWithProductDetails = {
  cartID: 11,
  userId: mockUserId,
  productId: mockProductId2,
  quantity: 1,
  // Flattened product details:
  productName: 'Test Product 2 Updated',
  productPrice: 5.50,
  imageUrl: null, // Example with null image URL
  availableQuantity: 50,
  storeName: 'Super Store B',
  storeId: mockStoreId2,
};

// The mock data array returned by the mocked getCart service method
const mockCartData: CartItemWithProductDetails[] = [
  mockCartItemWithDetails1,
  mockCartItemWithDetails2,
];

// Mock CartItem entity structure (for methods like addToCart, updateCartItem)
const mockBaseCartItem1: CartItem = {
    cartID: 10,
    userId: mockUserId,
    productId: mockProductId1,
    quantity: 2, // Initial quantity
    
    // Add user/product relations if they exist in your entity, otherwise omit or set to null
    // user: null,
    // product: null,
};

const mockAddedCartItem: CartItem = {
    ...mockBaseCartItem1,
    quantity: 3, // Quantity after adding/updating
 
}

// --- END MOCK DATA ---


// Mock CartService (using jest.fn() for all methods)
const mockCartService = {
  getCart: jest.fn(),
  addToCart: jest.fn(),
  syncCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
};

// Mock Request object helper
const mockRequest = (userId: string) => ({
  user: { sub: userId }, // Assuming 'sub' holds the user ID from JWT payload
});

// --- TEST SUITE ---

describe('CartController', () => {
  let controller: CartController;
  let service: typeof mockCartService; // Use typeof for better type checking on the mock

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService, // Use the mock implementation
        },
      ],
    })
      // Override the guard to always allow access for these unit/integration tests
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CartController>(CartController);
    // Get the instance of the mocked service to check calls, etc.
    service = module.get(CartService);

    // Reset mocks before each test to ensure isolation
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Test getCart ---
  describe('getCart', () => {
    it('should return the user cart with flattened product details', async () => {
      // Arrange: Mock service resolves with the updated (flattened) data structure
      service.getCart.mockResolvedValue(mockCartData);
      const req = mockRequest(mockUserId);

      // Act
      const result = await controller.getCart(req);

      // Assert
      expect(service.getCart).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockCartData); // Check against the updated mock data
    });

    it('should return an empty array if the cart is empty', async () => {
        // Arrange
        service.getCart.mockResolvedValue([]);
        const req = mockRequest(mockUserId);

        // Act
        const result = await controller.getCart(req);

        // Assert
        expect(service.getCart).toHaveBeenCalledWith(mockUserId);
        expect(result).toEqual([]);
    });


    it('should throw HttpException if service throws a generic error', async () => {
      // Arrange: Mock service rejects with a generic error
      const error = new Error('Database connection lost');
      service.getCart.mockRejectedValue(error);
      const req = mockRequest(mockUserId);

      // Act & Assert
      await expect(controller.getCart(req)).rejects.toThrow(
        new HttpException('Failed to fetch cart', HttpStatus.INTERNAL_SERVER_ERROR) // Controller catches generic error
      );
      expect(service.getCart).toHaveBeenCalledWith(mockUserId);
    });

     it('should re-throw HttpException from service if service throws HttpException', async () => {
        // Arrange: Mock service rejects with a specific NestJS HttpException
        const serviceError = new InternalServerErrorException("Failed to retrieve cart."); // Match the actual error thrown by service
        service.getCart.mockRejectedValue(serviceError);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.getCart(req)).rejects.toThrow(serviceError); // Controller should re-throw it
        expect(service.getCart).toHaveBeenCalledWith(mockUserId);
      });
  });

  // --- Test addToCart ---
  describe('addToCart', () => {
    const dto: CreateCartItemDto = { productId: mockProductId1, quantity: 1 };

    it('should add an item to the cart and return the resulting CartItem entity', async () => {
      // Arrange: Service returns the saved/updated CartItem entity
      service.addToCart.mockResolvedValue(mockAddedCartItem);
      const req = mockRequest(mockUserId);

      // Act
      const result = await controller.addToCart(req, dto);

      // Assert
      expect(service.addToCart).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockAddedCartItem); // Should return the CartItem, not CartItemWithProductDetails
    });

    it('should throw HttpException if service throws NotFoundException (product not found)', async () => {
      // Arrange
      const error = new NotFoundException(`Product with ID ${dto.productId} not found.`);
      service.addToCart.mockRejectedValue(error);
      const req = mockRequest(mockUserId);

      // Act & Assert
      await expect(controller.addToCart(req, dto)).rejects.toThrow(error);
      expect(service.addToCart).toHaveBeenCalledWith(mockUserId, dto);
    });

    it('should throw HttpException if service throws BadRequestException (e.g., out of stock)', async () => {
        // Arrange
        const error = new BadRequestException(`Cannot add ${dto.quantity} items. Only 0 available.`);
        service.addToCart.mockRejectedValue(error);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.addToCart(req, dto)).rejects.toThrow(error);
        expect(service.addToCart).toHaveBeenCalledWith(mockUserId, dto);
      });


    it('should throw generic HttpException for other unexpected service errors', async () => {
        // Arrange
        const error = new Error('Unexpected database issue');
        service.addToCart.mockRejectedValue(error);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.addToCart(req, dto)).rejects.toThrow(
          new HttpException('Failed to add item to cart', HttpStatus.INTERNAL_SERVER_ERROR)
        );
        expect(service.addToCart).toHaveBeenCalledWith(mockUserId, dto);
      });
  });

  // --- Test syncCart ---
  describe('syncCart', () => {
    const dto: SyncCartDto = { items: [{ productId: mockProductId1, quantity: 3 }, { productId: mockProductId2, quantity: 1}] };

    it('should sync the cart successfully and return a success message', async () => {
      // Arrange
      service.syncCart.mockResolvedValue(undefined); // Sync might not return data on success
      const req = mockRequest(mockUserId);

      // Act
      const result = await controller.syncCart(req, dto);

      // Assert
      expect(service.syncCart).toHaveBeenCalledWith(mockUserId, dto.items);
      expect(result).toEqual({ message: 'Cart synced successfully' });
    });

    it('should throw HttpException if service throws NotFoundException (product missing)', async () => {
      // Arrange
      const error = new NotFoundException(`Sync failed: Products not found with IDs: ${mockProductId2}.`);
      service.syncCart.mockRejectedValue(error);
      const req = mockRequest(mockUserId);

      // Act & Assert
      await expect(controller.syncCart(req, dto)).rejects.toThrow(error);
      expect(service.syncCart).toHaveBeenCalledWith(mockUserId, dto.items);
    });

    it('should throw generic HttpException for other unexpected service errors', async () => {
      // Arrange
      const error = new Error('Transaction failed');
      service.syncCart.mockRejectedValue(error);
      const req = mockRequest(mockUserId);

      // Act & Assert
      await expect(controller.syncCart(req, dto)).rejects.toThrow(
        new HttpException('Failed to sync cart', HttpStatus.INTERNAL_SERVER_ERROR)
      );
      expect(service.syncCart).toHaveBeenCalledWith(mockUserId, dto.items);
    });
  });

  // --- Test updateCartItem ---
  describe('updateCartItem', () => {
    const productIdToUpdate = mockProductId1;
    const dto: UpdateCartItemDto = { quantity: 5 };
    const updatedCartItemEntity = { ...mockBaseCartItem1, quantity: 5, updatedAt: new Date() };

    it('should update a cart item quantity and return the updated CartItem entity', async () => {
      // Arrange: Service returns the updated CartItem entity
      service.updateCartItem.mockResolvedValue(updatedCartItemEntity);
      const req = mockRequest(mockUserId);

      // Act: Pass the number directly (ParseIntPipe is handled by NestJS runtime)
      const result = await controller.updateCartItem(req, productIdToUpdate, dto);

      // Assert
      expect(service.updateCartItem).toHaveBeenCalledWith(mockUserId, productIdToUpdate, dto);
      expect(result).toEqual(updatedCartItemEntity); // Returns CartItem entity
    });

    it('should throw HttpException if item not found (NotFoundException from service)', async () => {
      // Arrange
      const error = new NotFoundException(`Cart item with product ID ${productIdToUpdate} not found.`);
      service.updateCartItem.mockRejectedValue(error);
      const req = mockRequest(mockUserId);

      // Act & Assert
      await expect(controller.updateCartItem(req, productIdToUpdate, dto)).rejects.toThrow(error);
      expect(service.updateCartItem).toHaveBeenCalledWith(mockUserId, productIdToUpdate, dto);
    });

    it('should throw HttpException if quantity is invalid (BadRequestException from service)', async () => {
        // Arrange
        const error = new BadRequestException(`Cannot set quantity to ${dto.quantity}. Only 3 available.`);
        service.updateCartItem.mockRejectedValue(error);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.updateCartItem(req, productIdToUpdate, dto)).rejects.toThrow(error);
        expect(service.updateCartItem).toHaveBeenCalledWith(mockUserId, productIdToUpdate, dto);
      });


    it('should throw generic HttpException for other unexpected service errors', async () => {
        // Arrange
        const error = new Error('Update failed unexpectedly');
        service.updateCartItem.mockRejectedValue(error);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.updateCartItem(req, productIdToUpdate, dto)).rejects.toThrow(
            new HttpException('Failed to update cart item', HttpStatus.INTERNAL_SERVER_ERROR)
        );
        expect(service.updateCartItem).toHaveBeenCalledWith(mockUserId, productIdToUpdate, dto);
      });
  });

  // --- Test removeFromCart ---
  describe('removeFromCart', () => {
    const productIdToRemove = mockProductId1;

    it('should remove an item from the cart and return success message', async () => {
      // Arrange: Service indicates success (item was found and deleted)
      service.removeFromCart.mockResolvedValue(true);
      const req = mockRequest(mockUserId);

      // Act
      const result = await controller.removeFromCart(req, productIdToRemove);

      // Assert
      expect(service.removeFromCart).toHaveBeenCalledWith(mockUserId, productIdToRemove);
      expect(result).toEqual({ message: 'Item removed from cart' });
    });

    it('should throw HttpException with NOT_FOUND if item was not found by service', async () => {
      // Arrange: Service indicates item not found (delete affected 0 rows)
      service.removeFromCart.mockResolvedValue(false);
      const req = mockRequest(mockUserId);

      // Act & Assert
      await expect(controller.removeFromCart(req, productIdToRemove)).rejects.toThrow(
        new HttpException('Item not found in cart', HttpStatus.NOT_FOUND) // Controller translates false to 404
      );
      expect(service.removeFromCart).toHaveBeenCalledWith(mockUserId, productIdToRemove);
    });

     it('should throw generic HttpException for other unexpected service errors', async () => {
        // Arrange
        const error = new Error('Deletion failed unexpectedly');
        service.removeFromCart.mockRejectedValue(error);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.removeFromCart(req, productIdToRemove)).rejects.toThrow(
            new HttpException('Failed to remove item from cart', HttpStatus.INTERNAL_SERVER_ERROR)
        );
        expect(service.removeFromCart).toHaveBeenCalledWith(mockUserId, productIdToRemove);
      });
  });

   // --- Test clearCart ---
  describe('clearCart', () => {
    it('should clear the entire cart and return success message', async () => {
        // Arrange: Service indicates items were deleted
        service.clearCart.mockResolvedValue(true);
        const req = mockRequest(mockUserId);

        // Act
        const result = await controller.clearCart(req);

        // Assert
        expect(service.clearCart).toHaveBeenCalledWith(mockUserId);
        expect(result).toEqual({ message: 'Cart cleared successfully' });
    });

    it('should return specific success message if cart was already empty', async () => {
        // Arrange: Service indicates nothing was deleted (cart was likely empty)
        service.clearCart.mockResolvedValue(false);
        const req = mockRequest(mockUserId);

        // Act
        const result = await controller.clearCart(req);

        // Assert
        expect(service.clearCart).toHaveBeenCalledWith(mockUserId);
        // Controller handles false from service gracefully
        expect(result).toEqual({ message: 'Cart cleared successfully (or was already empty)' });
    });

    it('should throw generic HttpException for unexpected service errors', async () => {
        // Arrange
        const error = new Error('Clear operation failed unexpectedly');
        service.clearCart.mockRejectedValue(error);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.clearCart(req)).rejects.toThrow(
            new HttpException('Failed to clear cart', HttpStatus.INTERNAL_SERVER_ERROR)
        );
        expect(service.clearCart).toHaveBeenCalledWith(mockUserId);
    });

     it('should re-throw HttpException from service if applicable', async () => {
        // Arrange
        const error = new InternalServerErrorException('Database error during clear');
        service.clearCart.mockRejectedValue(error);
        const req = mockRequest(mockUserId);

        // Act & Assert
        await expect(controller.clearCart(req)).rejects.toThrow(error);
        expect(service.clearCart).toHaveBeenCalledWith(mockUserId);
    });
  });

});