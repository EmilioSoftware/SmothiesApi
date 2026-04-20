import { Schema, model } from 'mongoose';

export interface CartItemDocument {
  smoothieId: string;
  quantity: number;
}

export interface CartDocument {
  clientId: string;
  items: CartItemDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItemDocument>(
  {
    smoothieId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const cartSchema = new Schema<CartDocument>(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export const CartModel = model<CartDocument>('Cart', cartSchema);
