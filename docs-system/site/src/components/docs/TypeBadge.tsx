interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span className="type-badge">
      {type}
    </span>
  );
}
