import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface DirectionalIconProps {
  className?: string;
  direction?: 'forward' | 'back';
}

export function DirectionalArrow({
  className = 'w-4 h-4',
  direction = 'forward',
}: DirectionalIconProps) {
  const { isRtl } = useLanguage();
  const pointsLeft = (isRtl && direction === 'forward') || (!isRtl && direction === 'back');

  return pointsLeft ? (
    <ArrowLeft className={className} aria-hidden="true" />
  ) : (
    <ArrowRight className={className} aria-hidden="true" />
  );
}

export function DirectionalChevron({
  className = 'w-4 h-4',
  direction = 'forward',
}: DirectionalIconProps) {
  const { isRtl } = useLanguage();
  const pointsLeft = (isRtl && direction === 'forward') || (!isRtl && direction === 'back');

  return pointsLeft ? (
    <ChevronLeft className={className} aria-hidden="true" />
  ) : (
    <ChevronRight className={className} aria-hidden="true" />
  );
}
