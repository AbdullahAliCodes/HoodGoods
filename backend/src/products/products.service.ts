import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAllActive(): Promise<Product[]> {
    return this.productRepository.find({ 
      where: { isActive: true },
      order: { prodId: 'ASC' }
    });
  }

  async findAll(filters?: { category?: string }): Promise<Product[]> {
    const query = this.productRepository.createQueryBuilder('product');
    
    if (filters?.category) {
      query.andWhere('product.productCategory = :category', { 
        category: filters.category 
      });
    }
    
    return query.getMany();
  }
}