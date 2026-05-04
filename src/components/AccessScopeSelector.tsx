import './AccessScopeSelector.css';

export type AccessScope = 'public' | 'school-only' | 'college-only';

interface AccessScopeSelectorProps {
  value: AccessScope;
  onChange: (scope: AccessScope) => void;
  isSchoolVerified: boolean;
  schoolDomain?: string;
}

const scopes: { id: AccessScope; name: string; desc: string }[] = [
  { id: 'public', name: 'Public', desc: 'Anyone nearby can see' },
  { id: 'school-only', name: 'My School', desc: 'Only verified students' },
  { id: 'college-only', name: 'College Network', desc: 'All verified colleges' },
];

export function AccessScopeSelector({
  value,
  onChange,
  isSchoolVerified,
  schoolDomain,
}: AccessScopeSelectorProps) {
  return (
    <div className="accessScopeGroup">
      <label className="accessScopeLabel">Who can see this?</label>
      <div className="accessScopeOptions">
        {scopes.map((scope) => {
          const disabled = scope.id !== 'public' && !isSchoolVerified;
          return (
            <button
              key={scope.id}
              className={`accessScopeBtn ${value === scope.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onChange(scope.id)}
              disabled={disabled}
              type="button"
              id={`scope-${scope.id}`}
            >
              <span className={`scopeDot ${scope.id}`} />
              <div className="scopeInfo">
                <div className="scopeName">
                  {scope.name}
                  {scope.id === 'school-only' && schoolDomain && (
                    <span className="schoolDomain"> ({schoolDomain})</span>
                  )}
                </div>
                <div className="scopeDesc">
                  {disabled ? 'Verify .edu email to unlock' : scope.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
