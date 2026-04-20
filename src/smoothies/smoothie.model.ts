import { Schema, model } from 'mongoose';

import { SmoothieCategory, SmoothieImagePreset } from './smoothie.types';

export interface SmoothieDocument {
  id: string;
  name: string;
  description: string;
  category: SmoothieCategory;
  ingredients: string[];
  price: number;
  calories: number;
  prepMinutes: number;
  popular: boolean;
  favorite: boolean;
  active: boolean;
  imagePreset: SmoothieImagePreset;
  createdAt: Date;
  updatedAt: Date;
}

const smoothieSchema = new Schema<SmoothieDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Clasicos', 'Tropicales', 'Proteina', 'Detox'], required: true },
    ingredients: [{ type: String, required: true, trim: true }],
    price: { type: Number, required: true, min: 1 },
    calories: { type: Number, required: true, min: 0 },
    prepMinutes: { type: Number, required: true, min: 1 },
    popular: { type: Boolean, default: false },
    favorite: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
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
  { timestamps: true, versionKey: false }
);

export const SmoothieModel = model<SmoothieDocument>('Smoothie', smoothieSchema);
