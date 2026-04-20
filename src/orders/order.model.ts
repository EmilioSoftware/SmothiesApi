import { Schema, model } from 'mongoose';

import { SmoothieCategory, SmoothieImagePreset } from '../smoothies/smoothie.types';

export type OrderStatus = 'processing' | 'delivered' | 'cancelled';
export type PaymentStatus = 'paid' | 'failed';

export interface OrderLineSnapshotDocument {
  smoothieId: string;
  quantity: number;
  name: string;
  category: SmoothieCategory;
  price: number;
  prepMinutes: number;
  imagePreset: SmoothieImagePreset;
}

export interface OrderDocument {
  id: string;
  clientId: string;
  status: OrderStatus;
  headline: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
    phone: string;
  };
  payment: {
    method: string;
    status: PaymentStatus;
    reference: string;
    last4?: string;
  };
  total: number;
  items: OrderLineSnapshotDocument[];
}

const orderLineSchema = new Schema<OrderLineSnapshotDocument>(
  {
    smoothieId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    category: { type: String, enum: ['Clasicos', 'Tropicales', 'Proteina', 'Detox'], required: true },
    price: { type: Number, required: true, min: 0 },
    prepMinutes: { type: Number, required: true, min: 1 },
    imagePreset: {
      type: String,
      enum: [
        'green-power',
        'berry-blast',
        'tropical-sunset',
        'fresa-paradise',
        'golden-protein',
        'blue-lagoon',
        'cacao-rush'
      ],
      required: true
    }
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    status: { type: String, enum: ['processing', 'delivered', 'cancelled'], required: true, default: 'processing' },
    headline: { type: String, required: true },
    note: { type: String, required: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true }
    },
    payment: {
      method: { type: String, required: true },
      status: { type: String, enum: ['paid', 'failed'], required: true },
      reference: { type: String, required: true },
      last4: { type: String }
    },
    total: { type: Number, required: true, min: 0 },
    items: { type: [orderLineSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export const OrderModel = model<OrderDocument>('Order', orderSchema);
