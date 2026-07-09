export interface TextTheme {
  id: string;
  name: string;
  fontFamily: string;
}

export const TEXT_THEMES: TextTheme[] = [
  {
    id: 'inter-clean',
    name: 'Inter',
    fontFamily: 'Inter, Arial, sans-serif',
  },
  {
    id: 'roboto-modern',
    name: 'Roboto',
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  {
    id: 'poppins-soft',
    name: 'Poppins',
    fontFamily: 'Poppins, Arial, sans-serif',
  },
  {
    id: 'serif-elegant',
    name: 'Playfair Display',
    fontFamily: '"Playfair Display", Georgia, serif',
  },
  {
    id: 'typewriter-pro',
    name: 'Courier New',
    fontFamily: '"Courier New", Courier, monospace',
  },
  {
    id: 'impact-bold',
    name: 'Impact Bold',
    fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  },
  {
    id: 'georgia-classic',
    name: 'Georgia Classic',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'trebuchet-clean',
    name: 'Trebuchet MS',
    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
  },
];
