import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Product } from '../products/entities/product.entity';

// --- INTERFACE CHANGE ---
// Interface for the structure returned to the frontend
export interface CartItemWithProductDetails extends Omit<CartItem, 'user' | 'product'> {
    // Inherits cartID, quantity, userId from CartItem
    productId: number;
    productName: string;
    productPrice: number;
    imageUrl: string | null;
    availableQuantity: number;
    storeName: string;
    storeId: string; // <<< ADD storeId HERE (using string because Product entity uses string for bigint)
}
// --- END INTERFACE CHANGE ---


@Injectable()
export class CartService {

  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getCart(userId: string): Promise<CartItemWithProductDetails[]> {
    try {
        const cartItems = await this.cartRepository.find({
            where: { userId },
            order: { cartID: 'ASC' }
        });

        const productIds = cartItems.map(item => item.productId);
        if (productIds.length === 0) {
            return [];
        }

        const products = await this.productRepository.findByIds(productIds);

        const productMap = new Map<number, Product>();
        products.forEach(product => productMap.set(product.prodId, product));

        const cartWithDetails = cartItems.map(item => {
            const product = productMap.get(item.productId);
            if (!product) {
                // console.warn(`Product with ID ${item.productId} not found for cart item ${item.cartID}. Excluding item.`);
                return null;
            }

            // ***** START CHANGE HERE *****
            return {
                cartID: item.cartID,
                productId: item.productId,
                quantity: item.quantity,
                userId: item.userId, // Make sure userId is included if the interface requires it
                productName: product.name,
                productPrice: product.price,
                imageUrl: product.imageUrl,
                availableQuantity: product.productquantity,
                storeName: product.storeName,
                storeId: product.storeId, // <<< ADD storeId from Product entity HERE
            };
            // ***** END CHANGE HERE *****

        }).filter(item => item !== null);

        // Add back the type assertion as it might be needed by your setup
        return cartWithDetails as CartItemWithProductDetails[];

    } catch (error) {
        console.error(`getCart: Error fetching cart for user ${userId}`, error.stack);
        throw new InternalServerErrorException("Failed to retrieve cart.");
    }
  }


  async addToCart(userId: string, dto: CreateCartItemDto): Promise<CartItem> {
    const product = await this.productRepository.findOne({ where: { prodId: dto.productId } });
    if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found.`);
    }
    const availableStock = Number(product.productquantity);
    if (isNaN(availableStock) || availableStock < 0) {
        throw new BadRequestException(`Product with ID ${dto.productId} is currently unavailable (invalid stock).`);
    }
    if (availableStock === 0) {
        throw new BadRequestException(`Product "${product.name}" is out of stock.`);
    }

    const existingItem = await this.cartRepository.findOne({
      where: { userId, productId: dto.productId }
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      if (newQuantity > availableStock) {
          throw new BadRequestException(`Cannot add ${dto.quantity} more items. Only ${availableStock - existingItem.quantity} left in stock for "${product.name}". Total available: ${availableStock}.`);
      } else {
          existingItem.quantity = newQuantity;
      }
      return this.cartRepository.save(existingItem);

    } else {
      if (dto.quantity > availableStock) {
         throw new BadRequestException(`Cannot add ${dto.quantity} items. Only ${availableStock} available for "${product.name}".`);
      }
      const newItem = this.cartRepository.create({
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
      });
      return this.cartRepository.save(newItem);
    }
  }

  async updateCartItem(userId: string, productId: number, dto: UpdateCartItemDto): Promise<CartItem> {
     if (dto.quantity <= 0) {
         throw new BadRequestException('Quantity must be greater than zero. Use remove endpoint to delete item.');
     }

     const item = await this.cartRepository.findOne({
       where: { userId, productId }
     });
     if (!item) {
       throw new NotFoundException(`Cart item with product ID ${productId} not found for this user.`);
     }

     const product = await this.productRepository.findOne({ where: { prodId: productId } });
     if (!product) {
       throw new NotFoundException(`Product with ID ${productId} not found (might have been deleted).`);
     }
     const availableStock = Number(product.productquantity);
     if (isNaN(availableStock) || availableStock < 0) {
         throw new BadRequestException(`Product with ID ${productId} is currently unavailable (invalid stock).`);
     }

     if (dto.quantity > availableStock) {
       throw new BadRequestException(`Cannot set quantity to ${dto.quantity}. Only ${availableStock} available for "${product.name}".`);
     }

     item.quantity = dto.quantity;
     return this.cartRepository.save(item);
   }

  async syncCart(userId: string, items: CreateCartItemDto[]): Promise<void> {
    await this.cartRepository.manager.transaction(async (transactionalEntityManager: EntityManager) => {
        await transactionalEntityManager.delete(CartItem, { userId });

        if (items.length === 0) {
            return;
        }

        const productIds = items.map(item => item.productId);
        let products: Product[];
        try {
            products = await transactionalEntityManager.findByIds(Product, productIds);
        } catch (error) {
            console.error(`syncCart [Transaction]: Error fetching products by IDs`, error.stack);
            throw new InternalServerErrorException('Failed to fetch product details during sync.');
        }

        const productMap = new Map<number, Product>();
        products.forEach(product => productMap.set(product.prodId, product));
        const missingIds = productIds.filter(id => !productMap.has(id));
        if (missingIds.length > 0) {
            throw new NotFoundException(`Sync failed: Products not found with IDs: ${missingIds.join(', ')}.`);
        }

        const newItems = items.map(item => {
            const product = productMap.get(item.productId);
            if (!product) {
               console.error(`syncCart [Transaction]: Product ${item.productId} unexpectedly not found in map.`);
               throw new InternalServerErrorException(`Sync failed: Product ${item.productId} missing during mapping.`);
            }

            const availableStock = Number(product.productquantity);
            if (isNaN(availableStock) || availableStock < 0) {
                throw new BadRequestException(`Product ID ${item.productId} has invalid stock data during sync.`);
            }

            let quantityToSave = item.quantity;
            if (quantityToSave > availableStock) {
                quantityToSave = availableStock;
            }

            if (quantityToSave <= 0) {
                return null;
            }

            const newItemEntity = transactionalEntityManager.create(CartItem, {
                userId,
                productId: item.productId,
                quantity: quantityToSave,
            });
            return newItemEntity;

        }).filter(item => item !== null) as CartItem[];

        if (newItems.length > 0) {
            try {
                await transactionalEntityManager.save(newItems);
            } catch (error) {
                console.error(`syncCart [Transaction]: Error saving new cart items`, error.stack);
                throw new InternalServerErrorException('Failed to save cart items during sync.');
            }
        }
    });
  }


  async removeFromCart(userId: string, productId: number): Promise<boolean> {
    const result = await this.cartRepository.delete({ userId, productId });
    return (result.affected ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await this.cartRepository.delete({ userId });
    return (result.affected ?? 0) > 0;
  }
}
