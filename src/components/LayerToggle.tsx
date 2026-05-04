import { useGetPostsQuery } from '../store/communityApi';
import { mockPins, layerConfig } from '../data/mockData';
import type { LayerType } from '../data/mockData';
import './LayerToggle.css';

interface LayerToggleProps {
  activeLayer: string;
  onLayerChange: (layer: string) => void;
  showDemoData?: boolean;
}

export function LayerToggle({ activeLayer, onLayerChange, showDemoData = true }: LayerToggleProps) {
  // Try to get counts from API, fall back to mock
  const { data: apiResponse } = useGetPostsQuery();

  const getCounts = () => {
    if (apiResponse?.data && apiResponse.data.length > 0) {
      const posts = apiResponse.data;
      return {
        all: posts.length,
        free: posts.filter(p => p.layer === 'free').length,
        events: posts.filter(p => p.layer === 'event').length,
        marketplace: posts.filter(p => p.layer === 'marketplace').length,
        hangout: posts.filter(p => p.layer === 'hangout' as any).length,
      };
    }
    // Fallback to mock data counts only if demo data is enabled
    if (showDemoData) {
      return {
        all: mockPins.filter(p => p.layer === 'free' ? (p as any).status !== 'gone' : true).length,
        free: mockPins.filter(p => p.layer === 'free' && (p as any).status !== 'gone').length,
        events: mockPins.filter(p => p.layer === 'events').length,
        marketplace: mockPins.filter(p => p.layer === 'marketplace').length,
        hangout: mockPins.filter(p => p.layer === 'hangout').length,
      };
    }
    // Real mode but empty data
    return { all: 0, free: 0, events: 0, marketplace: 0, hangout: 0 };
  };

  const counts = getCounts();

  return (
    <div className="layerBar" id="layer-toggle-bar">
      <button
        className={`layerPill ${activeLayer === 'all' ? 'active allActive' : ''}`}
        onClick={() => onLayerChange('all')}
        id="layer-all"
      >
        All
        <span className="pillCount">{counts.all}</span>
      </button>

      {(Object.keys(layerConfig) as LayerType[]).map((key) => {
        const config = layerConfig[key];
        const isActive = activeLayer === key;
        const activeClass = key === 'free' ? 'freeActive' : key === 'events' ? 'eventsActive' : key === 'hangout' ? 'hangoutActive' : 'marketActive';

        return (
          <button
            key={key}
            className={`layerPill ${isActive ? `active ${activeClass}` : ''}`}
            onClick={() => onLayerChange(key)}
            id={`layer-${key}`}
          >
            <span className="pillDot" style={{ background: config.color }} />
            {config.label}
            <span className="pillCount">{counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
