// types/lucide-react-native.d.ts

/**
 * Type augmentation for lucide-react-native
 *
 * Estratégia:
 * - Mantém controle explícito dos ícones usados no projeto
 * - Garante autocomplete e segurança de tipagem
 * - Evita problema de peer dependency com react-native-svg
 */

declare module 'lucide-react-native' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  // ==========================
  // BASE PROPS
  // ==========================
  export interface LucideProps {
    size?: number | string;
    color?: string;
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
    style?: StyleProp<ViewStyle>;
    opacity?: number;
    'data-testid'?: string;
  }

  export type LucideIcon = ForwardRefExoticComponent<
    LucideProps & RefAttributes<unknown>
  >;

  // ==========================
  // ICONS USED IN PROJECT
  // ==========================
  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;

  export const ArrowLeft: LucideIcon;
  export const ArrowDownLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowUpRight: LucideIcon;

  export const Award: LucideIcon;
  export const Banknote: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Bell: LucideIcon;

  export const BookOpen: LucideIcon;
  export const Calendar: LucideIcon;

  export const Check: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Database: LucideIcon;

  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;

  export const Clock: LucideIcon;
  export const Copy: LucideIcon;

  export const CreditCard: LucideIcon;
  export const Download: LucideIcon;
  export const FileDown: LucideIcon;

  export const Edit: LucideIcon;
  export const Edit3: LucideIcon;

  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Fingerprint: LucideIcon;

  export const File: LucideIcon;
  export const FileText: LucideIcon;

  export const Filter: LucideIcon;
  export const Home: LucideIcon;

  export const Info: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Layers: LucideIcon;

  export const List: LucideIcon;
  export const Lock: LucideIcon;

  export const LogIn: LucideIcon;
  export const LogOut: LucideIcon;

  export const Mail: LucideIcon;
  export const MailCheck: LucideIcon;
  export const Menu: LucideIcon;

  export const MessageCircle: LucideIcon;
  export const MessageSquare: LucideIcon;

  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;

  export const Moon: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;

  export const Music: LucideIcon;
  export const Paperclip: LucideIcon;

  export const Pause: LucideIcon;
  export const PenSquare: LucideIcon;
  export const PenLine: LucideIcon;

  export const Phone: LucideIcon;
  export const Play: LucideIcon;

  export const Plus: LucideIcon;
  export const RefreshCw: LucideIcon;

  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Save: LucideIcon;

  export const Settings: LucideIcon;
  export const Share: LucideIcon;
  export const Share2: LucideIcon;

  export const Shield: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Sparkles: LucideIcon;

  export const Square: LucideIcon;
  export const Star: LucideIcon;

  export const Sun: LucideIcon;
  export const Trash2: LucideIcon;

  export const TrendingDown: LucideIcon;
  export const TrendingUp: LucideIcon;

  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const UserPlus: LucideIcon;

  export const Users: LucideIcon;
  export const Video: LucideIcon;

  export const Wallet: LucideIcon;
  export const X: LucideIcon;

  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;
}
