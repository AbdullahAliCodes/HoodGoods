// src/orders/orders.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
  Inject
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { SellerOrderItem } from './entities/seller-order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Store } from '../store/entities/store.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { CreateOrderDto, CartItemDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';


@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(CartItem)
    private cartItemsRepository: Repository<CartItem>,
    @InjectRepository(SellerOrder)
    private sellerOrdersRepository: Repository<SellerOrder>,
    // Add this:
    @Inject(Logger) private readonly logger: Logger,
  ) {}

 // private readonly logger = new Logger(OrdersService.name);

  // ... (groupItemsByStore method - keep as is) ...
  private groupItemsByStore(items: CartItemDto[]): Record<string, CartItemDto[]> {
      return items.reduce((acc, item) => {
          const storeId = item.storeId.toString();
          if (!acc[storeId]) {
              acc[storeId] = [];
          }
          acc[storeId].push(item);
          return acc;
          }, {} as Record<string, CartItemDto[]>);
      }

  // ... (createOrder method - keep as is) ...
  async createOrder(createOrderDto: CreateOrderDto, buyerUserId: string): Promise<Order> {
      // ... (implementation) ...
        // --- Log Entry Point ---
        this.logger.log(`--- Service: createOrder method entered for user: ${buyerUserId} ---`);

        const {
        cartItems,
        deliverySelections,
        selectedArea,
        selectedPickupPoint,
        yocoChargeId, // Use if you add the column later
        frontendGrandTotal,
        } = createOrderDto;

        const groupedItems = this.groupItemsByStore(cartItems);
        const storeIds = Object.keys(groupedItems);
        // Get the actual product IDs (numbers) from the DTO
        const productIds = cartItems.map(item => item.productId);

        // --- Log Before Query Runner ---
        this.logger.log(`Service: Attempting to get query runner for user: ${buyerUserId}`);
        const queryRunner = this.dataSource.createQueryRunner();
        this.logger.log(`Service: Query runner obtained. Connecting and starting transaction for user: ${buyerUserId}`);

        let savedOrder: Order | null = null; // Variable to hold the saved order outside try block if needed

        try {
        await queryRunner.connect();
        await queryRunner.startTransaction();
        this.logger.log(`Service: Transaction started for user: ${buyerUserId}`);

        // --- Log Before Fetches ---
        this.logger.log(`Service: Inside TRY block. Fetching products and stores for user: ${buyerUserId}`);

        // --- 1. Fetch required data within transaction ---
        const products = await queryRunner.manager.findByIds(Product, productIds);
        // *** CORRECTED: Use 'prodId' (entity property name) for map key ***
        const productMap = new Map(products.map(p => [p.prodId, p]));

        const storeEntities = await queryRunner.manager.findByIds(Store, storeIds);
        // Use 'storeId' (entity property name) for map key
        const storeMap = new Map(storeEntities.map(s => [s.storeId.toString(), s]));


        // --- 2. Validate data & Calculate totals ---
        let calculatedGrandTotal = 0;
        // *** CORRECTED: Use Partial<SellerOrder> for type safety ***
        const sellerOrdersToCreate: Partial<SellerOrder>[] = [];

        for (const storeId of storeIds) {
            const currentStoreItems = groupedItems[storeId];
            const storeInfo = storeMap.get(storeId);
            const deliveryMethod = deliverySelections[storeId];

            // --- Validation Checks ---
            if (!storeInfo) {
                this.logger.error(`Store details not found for store ID: ${storeId} during order creation for user ${buyerUserId}.`);
                throw new NotFoundException(`Store details not found for store ID: ${storeId}`);
             }
            if (!deliveryMethod || (deliveryMethod !== 'standard' && deliveryMethod !== 'express')) {
                this.logger.error(`Invalid delivery method ('${deliveryMethod}') for store ID: ${storeId} during order creation for user ${buyerUserId}.`);
                throw new BadRequestException(`Invalid or missing delivery method ('${deliveryMethod}') for store ID: ${storeId}. Must be 'standard' or 'express'.`);
             }
            this.logger.debug(`Processing store ${storeId} (${storeInfo.storeName}) with ${deliveryMethod} delivery.`);

            let itemsSubtotal = 0;
            for (const item of currentStoreItems) {
            // *** CORRECTED: Use item.productId to lookup in map ***
            const productInfo = productMap.get(item.productId);

            if (!productInfo) {
                this.logger.error(`Product details not found for product ID: ${item.productId} during order creation for user ${buyerUserId}.`);
                throw new NotFoundException(`Product details not found for product ID: ${item.productId}`);
                }

            // --- Stock Check ---
            // Use 'productquantity' property from Product entity
            if (productInfo.productquantity < item.quantity) {
                this.logger.warn(`Insufficient stock for product ${item.productId} (${productInfo.name}). Required: ${item.quantity}, Available: ${productInfo.productquantity}`);
                throw new ConflictException(`Insufficient stock for product: ${productInfo.name} (ID: ${item.productId}). Only ${productInfo.productquantity} available.`);
                }

            itemsSubtotal += item.pricePerUnitSnapshot * item.quantity;
            } // End item loop

            // --- Calculate delivery & seller total ---
            const deliveryPrice = deliveryMethod === 'standard' ? storeInfo.standardPrice : storeInfo.expressPrice;
            const deliveryTime = deliveryMethod === 'standard' ? storeInfo.standardTime : storeInfo.expressTime;
            const sellerTotal = itemsSubtotal + deliveryPrice;

            calculatedGrandTotal += sellerTotal;

            // --- Store data for SellerOrder creation (using entity property names) ---
            sellerOrdersToCreate.push({
            userId: storeInfo.userId, // Seller's user ID
            deliveryMethod: deliveryMethod,
            deliveryPrice: deliveryPrice,
            deliveryTimeEstimate: deliveryTime,
            itemsSubtotal: itemsSubtotal,
            sellerTotal: sellerTotal,
            status: 'Processing',
            // createdAt and updatedAt handled by decorators
            });

        } // End store loop

        // --- Optional: Grand Total Verification ---
        if (Math.abs(calculatedGrandTotal - frontendGrandTotal) > 0.01) {
            this.logger.warn(`Grand total mismatch! Backend calculated: ${calculatedGrandTotal.toFixed(2)}, Frontend sent: ${frontendGrandTotal.toFixed(2)} for user ${buyerUserId}. Proceeding with backend total.`);
            }


        // --- 3. Create the main Order record (using entity property names) ---
        this.logger.debug(`Creating main order record for user ${buyerUserId}`);
        const newOrder = queryRunner.manager.create(Order, {
            userId: buyerUserId, // Buyer's ID
            orderDate: new Date(),
            grandTotal: calculatedGrandTotal,
            pickupArea: selectedArea,
            pickupPoint: selectedPickupPoint,
            // createdAt/updatedAt handled by decorators


        });
        savedOrder = await queryRunner.manager.save(Order, newOrder);
        const orderId = savedOrder.orderId; // Use property name
        this.logger.log(`Created Order ID: ${orderId} for user ${buyerUserId}`);
        // *** Logging for Timestamps (Keep for debugging if needed) ***
      //  this.logger.debug(`Saved Order Timestamps - Created: ${savedOrder.createdAt?.toISOString()}, Updated: ${savedOrder.updatedAt?.toISOString()}`);


        // --- 4. Create SellerOrder records and SellerOrderItem records ---
        let sellerIndex = 0;
        for (const storeId of storeIds) {
            const currentStoreItems = groupedItems[storeId];
            const sellerOrderData = sellerOrdersToCreate[sellerIndex++];
            const storeInfo = storeMap.get(storeId)!;

            this.logger.debug(`Creating SellerOrder for store ${storeId} (Seller: ${storeInfo.userId}) linked to Order ${orderId}`);
            const newSellerOrder = queryRunner.manager.create(SellerOrder, {
            ...sellerOrderData,
            orderId: orderId, // *** CORRECTED: Use property name 'orderId' ***
            // createdAt/updatedAt handled by decorators
            });
            const savedSellerOrder = await queryRunner.manager.save(SellerOrder, newSellerOrder);
            const sellerOrderId = savedSellerOrder.sellerOrderId; // Use property name
            // *** Logging for Timestamps (Keep for debugging if needed) ***
    //        this.logger.debug(`Saved SellerOrder ${sellerOrderId} Timestamps - Created: ${savedSellerOrder.createdAt?.toISOString()}, Updated: ${savedSellerOrder.updatedAt?.toISOString()}`);


            // *** CORRECTED: Use Partial<SellerOrderItem> for type safety ***
            const sellerOrderItemsToCreate: Partial<SellerOrderItem>[] = [];
            // --- 5. Prepare Items and Update Stock ---
            for (const item of currentStoreItems) {
            const productInfo = productMap.get(item.productId)!;

            this.logger.debug(`Preparing item ${item.productId} (Qty: ${item.quantity}) for SellerOrder ${sellerOrderId}`);
            // Prepare item record (using entity property names)
            sellerOrderItemsToCreate.push({
                // *** REMOVED: sellerOrderItemId (Primary Key, generated) ***
                sellerOrderId: sellerOrderId, // Foreign Key linking to SellerOrder
                productId: item.productId,    // Foreign Key linking to Product
                quantityOrdered: item.quantity,
                pricePerUnit: item.pricePerUnitSnapshot,
                productNameSnapshot: productInfo.name,
                // createdAt/updatedAt handled by decorators
            });

            // --- 6. !! Update Product Stock !! ---
            const newQuantity = productInfo.productquantity - item.quantity;
            this.logger.debug(`Updating stock for product ${item.productId} from ${productInfo.productquantity} to ${newQuantity}`);
            // *** CORRECTED: Use 'prodId' (entity property name) for update condition ***
            await queryRunner.manager.update(Product, productInfo.prodId, {
                productquantity: newQuantity,
            });
            productInfo.productquantity = newQuantity;

            } // End item loop

            // Save all items for the current seller order
            const savedItems = await queryRunner.manager.save(SellerOrderItem, sellerOrderItemsToCreate);
            this.logger.log(`Saved ${savedItems.length} items for SellerOrder ID: ${sellerOrderId}`);
            // *** Logging for Timestamps (Keep for debugging if needed) ***
            if (savedItems.length > 0) {
                // Use optional chaining and nullish coalescing for safety
                const firstItem = savedItems[0];
      //          this.logger.debug(`Saved SellerOrderItem ${firstItem.sellerOrderItemId} Timestamps - Created: ${firstItem.createdAt?.toISOString() ?? 'N/A'}, Updated: ${firstItem.updatedAt?.toISOString() ?? 'N/A'}`);
            }

        } // End seller loop


        // --- 7. Clear Buyer's Cart on Backend ---
        this.logger.debug(`Clearing cart items for user ${buyerUserId}`);
        // *** CORRECTED: Assuming CartItem entity uses 'userId' property name ***
        const deleteResult = await queryRunner.manager.delete(CartItem, { userId: buyerUserId });
        this.logger.log(`Deleted ${deleteResult.affected || 0} cart items for user ${buyerUserId}`);


        // --- 8. Commit Transaction ---
        this.logger.log(`Service: Attempting to commit transaction for user: ${buyerUserId}`);
        await queryRunner.commitTransaction();
        this.logger.log(`Service: Transaction committed successfully for user: ${buyerUserId}`);

        } catch (error) {
        // ... (error handling, rollback) ...
        this.logger.error(`--- Service: CATCH block reached for user ${buyerUserId}. Rolling back transaction. Error: ${error.message} ---`, error.stack);
        if (queryRunner.isTransactionActive) {
            this.logger.log(`Service: Attempting rollback for user ${buyerUserId}.`);
            await queryRunner.rollbackTransaction();
            this.logger.log(`Service: Transaction rolled back for user ${buyerUserId}.`);
        } else {
            this.logger.log(`Service: Transaction was not active when error caught for user ${buyerUserId}. Rollback skipped.`);
        }
        if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) { throw error; }
        throw new InternalServerErrorException('Failed to create order due to an unexpected internal error.');

        } finally {
        // ... (release query runner) ...
        this.logger.log(`--- Service: FINALLY block reached for user ${buyerUserId}. Releasing query runner. ---`);
        if (queryRunner.isReleased === false){ await queryRunner.release(); }
        else { this.logger.log(`Service: Query runner already released for user ${buyerUserId}.`) }
        }

        // --- 9. Return the created Order (if commit was successful) ---
        if (savedOrder) {
        // ... (final fetch and return) ...
        this.logger.log(`Service: Attempting final fetch for Order ID: ${savedOrder.orderId}`);
        try {
                const finalOrder = await this.ordersRepository.findOneOrFail({
                    // *** CORRECTED: Use property name 'orderId' in where clause ***
                    where: { orderId: savedOrder.orderId },
                    relations: [ 'user', 'sellerOrders', 'sellerOrders.seller', 'sellerOrders.items', 'sellerOrders.items.product' ],
                });
                this.logger.log(`Service: Successfully fetched final order details for Order ID: ${savedOrder.orderId}`);
                return finalOrder;
        } catch (fetchError) {
            this.logger.error(`Service: FAILED to fetch final order details after commit for Order ID: ${savedOrder.orderId}. Error: ${fetchError.message}`, fetchError.stack);
            throw new InternalServerErrorException('Order was created successfully, but failed to retrieve the final details.');
        }
        } else {
        // ... (handle savedOrder being null) ...
        this.logger.error(`Service: Order processing finished but savedOrder object is unexpectedly null for user ${buyerUserId}.`);
        throw new InternalServerErrorException('Order processing completed, but failed to retrieve order reference.');
        }

    } // End createOrder method

  // --- findSellerOrders method (Keep as is) ---
  async findSellerOrders(sellerUserId: string): Promise<SellerOrder[]> {
    // ... (implementation) ...
     this.logger.log(`Finding seller orders for seller user ID: ${sellerUserId}`);
    try {
      const sellerOrders = await this.sellerOrdersRepository.find({
        where: { userId: sellerUserId },
        relations: ['order', 'items', 'items.product'],
    //    order: { createdAt: 'DESC' } // Assuming createdAt exists and works eventually
      });
      this.logger.log(`Found ${sellerOrders.length} seller orders for seller user ID: ${sellerUserId}`);
      return sellerOrders;
    } catch (error) {
      this.logger.error(`Failed to find seller orders for seller user ID: ${sellerUserId}. Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve seller orders.');
    }
  }

  // --- calculateSellerEarnings method (Keep as is) ---
  async calculateSellerEarnings(sellerUserId: string, status?: string): Promise<{ totalEarnings: number }> {
    // ... (implementation) ...
     this.logger.log(`Calculating earnings for seller: ${sellerUserId}, status filter: ${status ?? 'None'}`);
    try {
      // Start building the query using the repository
      const queryBuilder = this.sellerOrdersRepository.createQueryBuilder('sellerOrder');

      // Select the SUM of the 'sellerTotal' column and alias it as 'totalEarnings'
      // Use the JS property name 'sellerTotal' here
      queryBuilder.select('SUM(sellerOrder.sellerTotal)', 'totalEarnings');

      // Filter by the seller's user ID
      // Use the JS property name 'userId' here
      queryBuilder.where('sellerOrder.userId = :sellerUserId', { sellerUserId });

      // Optionally filter by status if provided
      if (status) {
        // Use the JS property name 'status' here
        queryBuilder.andWhere('sellerOrder.status = :status', { status });
      }

      // Execute the query and get the raw result (which contains the sum)
      const result = await queryBuilder.getRawOne(); // Use getRawOne for aggregate results
      this.logger.debug(`Raw earnings result for seller ${sellerUserId} (status: ${status ?? 'All'}): ${JSON.stringify(result)}`); // Log the raw object

      // The sum might be null if no matching orders are found, default to 0
      // The result['totalEarnings'] might be a string, null, or number depending on DB/driver
      const rawSum = result?.totalEarnings; // Use optional chaining
      const totalEarnings = (rawSum !== null && rawSum !== undefined) ? parseFloat(String(rawSum)) : 0; // Convert to string before parseFloat for safety, handle null/undefined

      // Check for NaN after parsing
      if (isNaN(totalEarnings)) {
          this.logger.error(`Failed to parse earnings sum. Raw value was: ${rawSum}. Setting earnings to 0.`);
          return { totalEarnings: 0 }; // Return 0 if parsing failed
      }


      this.logger.log(`Calculated earnings for seller ${sellerUserId} (status: ${status ?? 'All'}): ${totalEarnings}`);
      return { totalEarnings };

    } catch (error) {
      this.logger.error(`Failed to calculate earnings for seller ${sellerUserId}. Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to calculate seller earnings.');
    }
  }

  // --- updateSellerOrderStatus method (Keep as is) ---
  async updateSellerOrderStatus(
      sellerOrderId: number,
      sellerUserId: string,
      updateOrderStatusDto: UpdateOrderStatusDto // Use the DTO here
  ): Promise<SellerOrder> {
    // ... (implementation) ...
     const { status: newStatus } = updateOrderStatusDto; // Extract status from DTO
    this.logger.log(`Attempting to update status for sellerOrder ID: ${sellerOrderId} by seller: ${sellerUserId} to status: ${newStatus}`);

    // 1. Find the specific SellerOrder by its ID
    // We include the userId in the where clause for an initial ownership check
    const sellerOrder = await this.sellerOrdersRepository.findOne({
        where: {
            sellerOrderId: sellerOrderId, // Use the correct property name
            userId: sellerUserId        // Ensure the order belongs to this seller
        }
    });

    // 2. Check if the order was found and belongs to the seller
    if (!sellerOrder) {
        this.logger.warn(`SellerOrder with ID ${sellerOrderId} not found or not owned by seller ${sellerUserId}.`);
        // Throw NotFoundException - ForbiddenException might be better if found but owned by someone else,
        // but NotFound is simpler if the query just returns null.
        throw new NotFoundException(`Seller order with ID ${sellerOrderId} not found or access denied.`);
    }

    // 3. Optional: Add logic for valid status transitions
    // Example: Prevent changing status from 'Shipped' back to 'Processing'
    // if (sellerOrder.status === 'Shipped' && newStatus === 'Processing') {
    //     throw new BadRequestException('Cannot change status from Shipped back to Processing.');
    // }
    // Add more rules as needed for your workflow

    // 4. Update the status property
    sellerOrder.status = newStatus;
    // The updatedAt field should be updated automatically by the @UpdateDateColumn decorator

    // 5. Save the updated entity
    try {
        const updatedOrder = await this.sellerOrdersRepository.save(sellerOrder);
        this.logger.log(`Successfully updated status for sellerOrder ID: ${sellerOrderId} to ${newStatus}`);
        return updatedOrder;
    } catch (error) {
        this.logger.error(`Failed to save updated status for sellerOrder ID: ${sellerOrderId}. Error: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to update order status.');
    }
  }

  // --- NEW METHOD: Find orders for a specific buyer ---
  async findBuyerOrders(buyerUserId: string): Promise<Order[]> {
    this.logger.log(`Finding orders for buyer user ID: ${buyerUserId}`);
    try {
      // Use the Order repository to find main orders
      const orders = await this.ordersRepository.find({
        where: {
          userId: buyerUserId // Filter by the buyer's user ID property
        },
        // Specify relations to load along with the Order
        // This structure matches the buyer's view requirements
        relations: [
          'sellerOrders',              // Load the SellerOrders associated with this Order
          'sellerOrders.items',        // Load the Items within each SellerOrder
          'sellerOrders.items.product',// Load the Product details for each Item
          // Optional: Load seller info if needed for display (e.g., Store Name)
          // 'sellerOrders.seller',    // Loads the User entity for the seller
          // If you need Store Name, you might need a relation from SellerOrder to Store or User to Store
          // Or fetch Store info separately if needed. Let's keep it simpler for now.
        ],
        // Order by creation date (or order date), newest first
        order: {
          // Use 'orderDate' or 'createdAt' depending on preference
          orderDate: 'DESC',
          // Optional secondary sort if dates are identical
          // orderId: 'DESC'
        }
      });
      this.logger.log(`Found ${orders.length} orders for buyer user ID: ${buyerUserId}`);
      return orders;
    } catch (error) {
      this.logger.error(`Failed to find orders for buyer user ID: ${buyerUserId}. Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve buyer orders.');
    }
  }

} // End OrdersService class
