import { StatusPill } from './StatusPill';

type Props = {
  type: 'missing' | 'contradiction' | 'priority';
  severity?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  label: string;
};

export function FlagBadge({ type, severity, label }: Props) {
  const tone =
    type === 'priority'
      ? severity === 'HIGH'
        ? 'urgent'
        : severity === 'MEDIUM'
          ? 'wait'
          : 'ok'
      : 'wait';
  return <StatusPill label={label} tone={tone} />;
}
