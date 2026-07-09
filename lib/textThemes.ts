export interface TextTheme {
  id: string;
  name: string;
  fontFamily: string;
  fontSize?: number;
  color?: string;
  bgColor?: string;
}

export const TEXT_THEMES: TextTheme[] = [
  {
    id: 'inter-clean',
    name: 'Inter',
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 20,
    color: '#ffffff',
    bgColor: '#00000000',
  },
  {
    id: 'roboto-modern',
    name: 'Roboto',
    fontFamily: 'Roboto, Arial, sans-serif',
    fontSize: 20,
    color: '#ffffff',
    bgColor: '#00000000',
  },
  {
    id: 'poppins-soft',
    name: 'Poppins',
    fontFamily: 'Poppins, Arial, sans-serif',
    fontSize: 20,
    color: '#f5f0d8',
    bgColor: '#00000000',
  },
  {
    id: 'serif-elegant',
    name: 'Playfair Display',
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 22,
    color: '#ffefc5',
    bgColor: '#00000000',
  },
  {
    id: 'typewriter-pro',
    name: 'Courier New',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: 22,
    color: '#e9ddc4',
    bgColor: '#00000000',
  },
  {
    id: 'impact-bold',
    name: 'Impact Bold',
    fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    fontSize: 28,
    color: '#ffffff',
    bgColor: '#00000000',
  },
  {
    id: 'georgia-classic',
    name: 'Georgia Classic',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 23,
    color: '#f7e4bb',
    bgColor: '#00000000',
  },
  {
    id: 'comic-friendly',
    name: 'Comic Friendly',
    fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
    fontSize: 22,
    color: '#ffef6e',
    bgColor: '#00000000',
  },
  {
    id: 'cinema-card',
    name: 'Cinema Card',
    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
    fontSize: 24,
    color: '#f8d66d',
    bgColor: '#1a0c05',
  },
  {
    id: 'neon-pop',
    name: 'Neon Pop',
    fontFamily: 'Verdana, Geneva, sans-serif',
    fontSize: 24,
    color: '#25d0ab',
    bgColor: '#07040c',
  },
  {
    id: 'caption-box',
    name: 'Caption Box',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 21,
    color: '#111111',
    bgColor: '#f2d40b',
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    fontFamily: 'Poppins, Arial, sans-serif',
    fontSize: 21,
    color: '#ffd6e7',
    bgColor: '#00000000',
  },
];
