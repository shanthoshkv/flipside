import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { Merriweather_400Regular, Merriweather_700Bold } from '@expo-google-fonts/merriweather';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

/** The five roles every screen uses. Each family maps them onto the weights it actually has. */
export interface FontSet { head: string; headBold: string; body: string; bodyMed: string; bodyBold: string }
export type FontPref = 'default' | 'system' | 'atkinson' | 'lexend' | 'nunito' | 'merriweather' | 'jetbrains' | 'pixelcode';

export const FONT_SETS: Record<FontPref, FontSet> = {
  default: { head: 'SpaceGrotesk_600SemiBold', headBold: 'SpaceGrotesk_700Bold', body: 'Inter_400Regular', bodyMed: 'Inter_500Medium', bodyBold: 'Inter_600SemiBold' },
  system: { head: 'sans-serif-medium', headBold: 'sans-serif-medium', body: 'sans-serif', bodyMed: 'sans-serif-medium', bodyBold: 'sans-serif-medium' },
  atkinson: { head: 'AtkinsonHyperlegible_700Bold', headBold: 'AtkinsonHyperlegible_700Bold', body: 'AtkinsonHyperlegible_400Regular', bodyMed: 'AtkinsonHyperlegible_400Regular', bodyBold: 'AtkinsonHyperlegible_700Bold' },
  lexend: { head: 'Lexend_600SemiBold', headBold: 'Lexend_700Bold', body: 'Lexend_400Regular', bodyMed: 'Lexend_500Medium', bodyBold: 'Lexend_600SemiBold' },
  nunito: { head: 'Nunito_600SemiBold', headBold: 'Nunito_700Bold', body: 'Nunito_400Regular', bodyMed: 'Nunito_500Medium', bodyBold: 'Nunito_600SemiBold' },
  merriweather: { head: 'Merriweather_700Bold', headBold: 'Merriweather_700Bold', body: 'Merriweather_400Regular', bodyMed: 'Merriweather_400Regular', bodyBold: 'Merriweather_700Bold' },
  jetbrains: { head: 'JetBrainsMono_600SemiBold', headBold: 'JetBrainsMono_700Bold', body: 'JetBrainsMono_400Regular', bodyMed: 'JetBrainsMono_500Medium', bodyBold: 'JetBrainsMono_600SemiBold' },
  pixelcode: { head: 'PixelCode_DemiBold', headBold: 'PixelCode_Bold', body: 'PixelCode', bodyMed: 'PixelCode_Medium', bodyBold: 'PixelCode_DemiBold' },
};

export const FONT_LABELS: Record<FontPref, string> = {
  default: 'Default', system: 'System', atkinson: 'Atkinson (easy to read)', lexend: 'Lexend (reading)', nunito: 'Nunito (rounded)',
  merriweather: 'Merriweather (serif)', jetbrains: 'JetBrains Mono', pixelcode: 'PixelCode (pixel)',
};

// Only the family in use is loaded, so launch stays fast and memory stays low.
const FILES: Record<FontPref, Record<string, number>> = {
  default: { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold },
  system: {},
  atkinson: { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold },
  lexend: { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold },
  nunito: { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold },
  merriweather: { Merriweather_400Regular, Merriweather_700Bold },
  jetbrains: { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold },
  pixelcode: {
    PixelCode: require('../assets/fonts/PixelCode.ttf'),
    PixelCode_Medium: require('../assets/fonts/PixelCode-Medium.ttf'),
    PixelCode_DemiBold: require('../assets/fonts/PixelCode-DemiBold.ttf'),
    PixelCode_Bold: require('../assets/fonts/PixelCode-Bold.ttf'),
  },
};
export const fontFiles = (p: FontPref) => ({ ...FILES.default, ...FILES[p] }); // default always stays loaded as the fallback
