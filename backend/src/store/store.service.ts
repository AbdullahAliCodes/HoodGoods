// src/store/store.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';
import { User } from '../auth/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
// --- Import the DTO for updating the store ---
import { UpdateStoreDto } from './dto/update-store.dto';
// --- End Import ---

// Interface for the getDeliveryOptionsForStores method (keep as is)
export interface StoreDeliveryDetails {
    storeId: string;
    standardPrice: number;
    standardTime: string;
    expressPrice: number;
    expressTime: string;
    storeName?: string;
}

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly entityManager: EntityManager,
  ) {}

  async createStoreWithProducts(createStoreDto: CreateStoreDto, userId: string): Promise<Store> {
    return this.entityManager.transaction(async transactionalEntityManager => {
      const storeRepo = transactionalEntityManager.getRepository(Store);
      const productRepo = transactionalEntityManager.getRepository(Product);
      const userRepo = transactionalEntityManager.getRepository(User);

      const user = await userRepo.findOne({ where: { userID: userId } });
      if (!user) throw new NotFoundException('User not found');

      const existingStore = await storeRepo.findOne({ where: { userId: userId } });
      if (existingStore) throw new ConflictException(`User already has a store named '${existingStore.storeName}'.`);

      // Create Store
      const newStore = storeRepo.create({
        userId: userId,
        storeName: createStoreDto.storeName,
        standardPrice: createStoreDto.standardPrice,
        standardTime: createStoreDto.standardTime,
        expressPrice: createStoreDto.expressPrice,
        expressTime: createStoreDto.expressTime,
      });
      const savedStore = await storeRepo.save(newStore);

      // Prepare and Create Products
      const productEntities = createStoreDto.products.map(productDto => {
        return productRepo.create({
          name: productDto.name,
          description: productDto.description,
          price: productDto.price,
          category: productDto.category,
          imageUrl: productDto.imageUrl,
          productquantity: productDto.productquantity,
          userId: userId,
          storeId: savedStore.storeId,
          storeName: savedStore.storeName, // Ensure storeName is set here
          isActive: true,
        });
      });

      await productRepo.save(productEntities);
      return await storeRepo.findOneOrFail({ where: { storeId: savedStore.storeId }});

    }).catch(error => {
        if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
            throw error;
        }
        console.error("Transaction failed in createStoreWithProducts:", error);
        if (error.driverError) console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
        throw new InternalServerErrorException("Failed to create store due to an internal error.");
    });
  }

  async getStoreByUserId(userId: string): Promise<{ store: Store; products: Product[] }> {
     const store = await this.storeRepository.findOne({ where: { userId: userId }});
     if (!store) {
       const user = await this.userRepository.findOne({ where: { userID: userId } });
       if (!user) throw new NotFoundException('User not found');
       throw new NotFoundException(`No store found for this user.`);
     }
     const products = await this.productRepository.find({
         where: { storeId: store.storeId },
         order: { prodId: 'ASC' }
     });
     return { store, products };
  }

  // --- NEW: Method to Update Store Delivery Options ---
  async updateStoreDeliveryOptions(userId: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
    // 1. Find the store owned by the user
    const store = await this.storeRepository.findOne({ where: { userId: userId } });

    if (!store) {
      throw new NotFoundException(`Store not found for user ID ${userId}. Cannot update.`);
    }

    // 2. Merge the changes from the DTO into the found store entity
    // `merge` only updates fields present in the DTO.
    // ValidationPipe handles DTO validation in the controller.
    this.storeRepository.merge(store, updateStoreDto);

    // 3. Save the updated store entity
    try {
      // The save method will return the updated entity
      const updatedStore = await this.storeRepository.save(store);
      return updatedStore;
    } catch (error) {
      console.error(`Error updating store delivery options for user ${userId}:`, error);
      // Log detailed driver error if available
      if (error.driverError) {
        console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
      }
      throw new InternalServerErrorException('Failed to update store delivery options.');
    }
  }
  // --- End NEW Method ---


  // --- Product related methods ---

  async addProduct(userId: string, productDto: CreateProductDto): Promise<Product> {
    const store = await this.storeRepository.findOne({ where: { userId: userId } });
    if (!store) {
      throw new NotFoundException(`Cannot add product: No Store found for user ID ${userId}. Create a store first.`);
    }

    const newProduct = this.productRepository.create({
        name: productDto.name,
        description: productDto.description,
        price: productDto.price,
        category: productDto.category,
        imageUrl: productDto.imageUrl,
        productquantity: productDto.productquantity,
        userId: userId,
        storeId: store.storeId,
        storeName: store.storeName,
        isActive: true,
    });

    try {
        const savedProduct = await this.productRepository.save(newProduct);
        return savedProduct;
    } catch (error) {
        console.error("Error adding product:", error);
        if (error.driverError) console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
        throw new InternalServerErrorException("Failed to add product.");
    }
  }

  async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
     const product = await this.productRepository.findOne({ where: { prodId: productId } });
     if (!product) throw new NotFoundException(`Product ID ${productId} not found`);
     if (product.userId !== userId) throw new ForbiddenException('You are not authorized to update this product.');

     this.productRepository.merge(product, updateProductDto);

     try {
         return await this.productRepository.save(product);
     } catch (error) {
         console.error(`Error updating product ${productId}:`, error);
         if (error.driverError) console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
         throw new InternalServerErrorException("Failed to update product.");
     }
   }

  async deleteProduct(productId: number, userId: string): Promise<void> {
     const product = await this.productRepository.findOne({ where: { prodId: productId, userId: userId } });
     if (!product) throw new NotFoundException(`Product ID ${productId} not found or you do not have permission to delete it.`);

     const deleteResult = await this.productRepository.delete(productId);

     if (deleteResult.affected === 0) {
         console.warn(`Attempted to delete product ID ${productId}, but no rows were affected.`);
         throw new InternalServerErrorException(`Failed to delete product ID ${productId}.`);
     }
   }

  // --- Existing getDeliveryOptionsForStores method (keep as is) ---
  async getDeliveryOptionsForStores(storeIds: string[]): Promise<Record<string, StoreDeliveryDetails>> {
    if (!storeIds || storeIds.length === 0) return {};

    try {
      const stores = await this.storeRepository.find({
        where: { storeId: In(storeIds) },
        select: ['storeId', 'storeName', 'standardPrice', 'standardTime', 'expressPrice', 'expressTime'],
      });

      const deliveryOptionsMap: Record<string, StoreDeliveryDetails> = {};
      stores.forEach(store => {
        deliveryOptionsMap[store.storeId] = {
          storeId: store.storeId,
          storeName: store.storeName,
          standardPrice: store.standardPrice,
          standardTime: store.standardTime,
          expressPrice: store.expressPrice,
          expressTime: store.expressTime,
        };
      });

      if (stores.length !== storeIds.length) {
          const foundIds = stores.map(s => s.storeId);
          const missingIds = storeIds.filter(id => !foundIds.includes(id));
          console.warn(`Delivery options requested for stores, but some were not found: ${missingIds.join(', ')}`);
      }
      return deliveryOptionsMap;

    } catch (error) {
      console.error(`Error fetching delivery options for stores [${storeIds.join(', ')}]:`, error);
      throw new InternalServerErrorException('Failed to retrieve store delivery options.');
    }
  }
  // --- End getDeliveryOptionsForStores ---

} // End of StoreService class