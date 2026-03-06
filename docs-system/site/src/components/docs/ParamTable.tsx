import { TypeBadge } from './TypeBadge';

interface Param {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  default?: string;
}

interface ParamTableProps {
  params: Param[];
}

export function ParamTable({ params }: ParamTableProps) {
  return (
    <table className="api-param-table">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {params.map(param => (
          <tr key={param.name}>
            <td>
              <code className="text-[var(--color-primary)]">{param.name}</code>
              {param.optional && (
                <span className="text-[var(--color-text-secondary)] text-xs ml-1">
                  (optional)
                </span>
              )}
            </td>
            <td>
              <TypeBadge type={param.type} />
              {param.default && (
                <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                  = {param.default}
                </span>
              )}
            </td>
            <td className="text-[var(--color-text-secondary)]">
              {param.description || '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
