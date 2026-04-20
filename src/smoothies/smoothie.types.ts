export type SmoothieCategory = 'Clasicos' | 'Tropicales' | 'Proteina' | 'Detox';
export type FilterCategory = 'Todos' | SmoothieCategory;
export type SmoothieImagePreset =
  | 'green-power'
  | 'berry-blast'
  | 'tropical-sunset'
  | 'fresa-paradise'
  | 'golden-protein'
  | 'blue-lagoon'
  | 'cacao-rush';

export interface SmoothieDto {
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
}

export interface SmoothieDraft {
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
  image: SmoothieImagePreset;
}

export interface CatalogQuery {
  searchTerm?: string;
  category?: FilterCategory;
  includeInactive?: boolean;
}

export const SMOOTHIE_CATEGORY_ORDER: SmoothieCategory[] = [
  'Clasicos',
  'Tropicales',
  'Proteina',
  'Detox'
];

export const SMOOTHIE_IMAGE_PRESETS: SmoothieImagePreset[] = [
  'green-power',
  'berry-blast',
  'tropical-sunset',
  'fresa-paradise',
  'golden-protein',
  'blue-lagoon',
  'cacao-rush'
];
