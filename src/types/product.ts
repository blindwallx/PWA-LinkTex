// src/types/product.ts

import { Timestamp } from 'firebase/firestore';

export interface Process {
  name: string;
  value: number;
}

export interface Product {
  id?: string;
  name: string;
  ref: string;
  productionCost: number;
  processes: Process[];
  createdAt: Timestamp;
}

export interface ProductVariant {
  id?: string;
  color: string;
  stockInProduction: number;
  createdAt: Timestamp;
  startDate: Timestamp;
  dueDate?: Timestamp; // <--- ¡Asegúrate de que esta línea esté presente y correcta!
}

export interface ProductVariantFormData {
  color: string;
  stockInProduction: number;
  startDate: Timestamp;
  dueDate?: Timestamp; // <--- ¡Asegúrate de que esta línea esté presente y correcta!
}

export interface ProductFormData {
  name: string;
  ref: string;
  productionCost: number;
}