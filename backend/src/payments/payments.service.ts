import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // To access environment variables (API keys)
// Example using axios:
import axios from 'axios';
// Import crypto for webhook verification (No longer needed)
// import * as crypto from 'crypto';
// Import Order repository if needed
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Order } from './entities/order.entity';

@Injectable()
export class PaymentsService {
  private readonly yocoSecretKey: string;
  // Removed yocoWebhookSecret

  constructor(
    private readonly configService: ConfigService,
    // @InjectRepository(Order) private readonly orderRepository: Repository<Order>, // Inject if needed
  ) {
    this.yocoSecretKey = this.configService.get<string>('YOCO_SECRET_KEY', 'sk_test_960bfde0VBrLlpK098e4ffeb53e1');

    if (!this.yocoSecretKey) {
      throw new Error('Yoco Secret Key (YOCO_SECRET_KEY) is not configured in environment variables.');
    }
    console.log('[PaymentsService] Initialized. Using Yoco Secret Key starting with:', this.yocoSecretKey?.substring(0, 10));
  }

  async createYocoCheckout(
    userId: string,
    amountInCents: number,
    currency: string,
    // other details like orderId, customer info...
  ): Promise<string> {
    console.log(`[PaymentsService] createYocoCheckout called for user ${userId}, amount ${amountInCents} ${currency}`);

    // Call Yoco API to create checkout
    try {
      const yocoApiUrl = 'https://payments.yoco.com/api/checkouts';
      const payload = {
        amount: amountInCents,
        currency: currency,
        // metadata: { userId }, // Example metadata
      };
      const headers = {
        'Authorization': `Bearer ${this.yocoSecretKey}`,
        'Content-Type': 'application/json',
      };

      // *** ADDED more detailed logging ***
      console.log(`[PaymentsService] Preparing to call Yoco API: POST ${yocoApiUrl}`);
      console.log(`[PaymentsService] Payload: ${JSON.stringify(payload)}`);
      console.log(`[PaymentsService] Headers (Authorization masked): Authorization: Bearer ${this.yocoSecretKey.substring(0,10)}..., Content-Type: ${headers['Content-Type']}`);

      // Make the actual API call
      const response = await axios.post(yocoApiUrl, payload, { headers });

      console.log("[PaymentsService] Yoco checkout response status:", response.status);
      console.log("[PaymentsService] Yoco checkout response data:", response.data);

      // Define a simple interface for the expected part of the response
      interface YocoCheckoutResponse {
        id: string;
      }

      // Type assertion and ID extraction
      const responseData = response.data as YocoCheckoutResponse;
      console.log("[PaymentsService] Attempting to extract checkout ID from response...");
      const checkoutId = responseData?.id;

      if (!checkoutId) {
        console.error("[PaymentsService] Yoco response missing checkout ID:", response.data);
        // Throw error if ID is missing AFTER successful call
        throw new InternalServerErrorException('Failed to retrieve checkoutId from Yoco response.');
      }

      console.log(`[PaymentsService] Successfully created Yoco checkout ID: ${checkoutId}`);
      return checkoutId;

    } catch (error) {
      // This block catches errors from axios.post or ID extraction
      const errorStatus = error.response?.status;
      const errorDetails = error.response?.data || error.message;
      // *** THIS IS THE LOG YOU SHOULD BE LOOKING FOR ***
      console.error(`[PaymentsService] Error caught within createYocoCheckout (Status: ${errorStatus}):`, errorDetails, error.stack);
      // Re-throw an error to be caught by the controller
      throw new InternalServerErrorException(`Could not create Yoco checkout session: ${errorDetails}`);
    }
  }


}
