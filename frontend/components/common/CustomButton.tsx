import { Button } from '@/components/ds/Button';

interface ButtonProps {
  content: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

/**
 * Legacy API kept so screens that aren't redesigned yet pick up the new primary button.
 * New code: use `Button` from '@/components/ds'.
 */
export function CustomButton({ content, onPress, disabled = false, className = '', textClassName = '' }: ButtonProps) {
  return <Button title={content} onPress={onPress} disabled={disabled} className={className} textClassName={textClassName} />;
}
