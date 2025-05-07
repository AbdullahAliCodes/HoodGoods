// src/auth/user.entity.ts
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('Users')
export class User {
  @PrimaryColumn('varchar')
  userID: string;

  @Column({ default: 'buyer' })
  role: string;
}
