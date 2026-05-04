import { useState } from 'react';
import './TimeFilter.css';

export type TimeFilterMode = 'all' | 'now' | 'today' | 'this-week' | 'custom';

export interface TimeFilterValue {
  mode: TimeFilterMode;
  startTime?: string;
  endTime?: string;
}

interface TimeFilterProps {
  value: TimeFilterValue;
  onChange: (filter: TimeFilterValue) => void;
}

const pills: { mode: TimeFilterMode; label: string; hasDot?: boolean }[] = [
  { mode: 'all', label: 'All Times' },
  { mode: 'now', label: 'Now', hasDot: true },
  { mode: 'today', label: 'Today' },
  { mode: 'this-week', label: 'This Week' },
  { mode: 'custom', label: 'Custom' },
];

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handlePillClick = (mode: TimeFilterMode) => {
    if (mode === 'custom') {
      setShowCustom(!showCustom);
      return;
    }
    setShowCustom(false);
    onChange({ mode });
  };

  const handleApplyCustom = () => {
    onChange({ mode: 'custom', startTime: customStart, endTime: customEnd });
    setShowCustom(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="timeFilterBar" id="time-filter-bar">
        {pills.map((pill) => (
          <button
            key={pill.mode}
            className={`timePill ${value.mode === pill.mode ? 'active' : ''}`}
            onClick={() => handlePillClick(pill.mode)}
            id={`time-${pill.mode}`}
          >
            {pill.hasDot && <span className="timePillDot" />}
            {pill.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="timeRangeOverlay">
          <div className="timeRangeTitle">Custom Time Range</div>
          <div className="timeRangeRow">
            <div style={{ flex: 1 }}>
              <label>From</label>
              <input
                type="datetime-local"
                className="timeRangeInput"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>To</label>
              <input
                type="datetime-local"
                className="timeRangeInput"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
          <button className="timeRangeApply" onClick={handleApplyCustom}>
            Apply Filter
          </button>
        </div>
      )}
    </div>
  );
}
