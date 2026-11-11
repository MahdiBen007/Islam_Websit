import {
  BarChart3,
  BookOpen,
  Cpu,
  FlaskConical,
  Megaphone,
  Palette,
  Terminal,
  Wrench,
} from 'lucide-react';
import type { Specialization } from '@/types/domain';

interface SpecializationIconProps {
  icon: Specialization['icon'];
  className?: string;
}

export function SpecializationIcon({
  icon,
  className = 'w-4 h-4 text-secondary',
}: SpecializationIconProps) {
  switch (icon) {
    case 'terminal':
      return <Terminal className={className} aria-hidden="true" />;
    case 'cpu':
      return <Cpu className={className} aria-hidden="true" />;
    case 'palette':
      return <Palette className={className} aria-hidden="true" />;
    case 'campaign':
      return <Megaphone className={className} aria-hidden="true" />;
    case 'analytics':
      return <BarChart3 className={className} aria-hidden="true" />;
    case 'engineering':
      return <Wrench className={className} aria-hidden="true" />;
    case 'science':
      return <FlaskConical className={className} aria-hidden="true" />;
    case 'book':
    default:
      return <BookOpen className={className} aria-hidden="true" />;
  }
}
