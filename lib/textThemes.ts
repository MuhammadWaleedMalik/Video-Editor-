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
];

