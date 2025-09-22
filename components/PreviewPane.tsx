import React from 'react';
import { safeText, formatDate, classNames } from './utils';
import type { ContentItem } from './ContentList';

type PreviewPaneProps = {
  item: ContentItem | null;
  onOpenExternal?: (id: string) => void;
};

export const PreviewPane: React.FC<PreviewPaneProps> = ({ item, onOpenExternal }) => {
  return (
    <aside className={classNames('ax-content-preview')}>
      {!item ? (
        <div aria-hidden="true">
          <div className="ax-skeleton ax-skeleton--text" style={{ width: '72%', height: 20 }} />
          <div className="ax-skeleton ax-skeleton--text" style={{ width: '40%', height: 16, marginTop: 8 }} />
          <div className="ax-skeleton ax-skeleton--block" style={{ height: 160, marginTop: 16 }} />
          <div className="ax-skeleton ax-skeleton--block" style={{ height: 16, marginTop: 8 }} />
          <div className="ax-skeleton ax-skeleton--block" style={{ height: 16, marginTop: 8 }} />
        </div>
      ) : (
        <div className="ax-preview">
          <h3 className="ax-preview__title">{safeText(item.title)}</h3>
          <div className="ax-preview__meta">
            <span className="ax-badge">{formatDate(item.createdAt)}</span>
            {item.tags && item.tags.length > 0 ? (
              <span className="ax-preview__tags">
                {item.tags.slice(0, 5).map((t) => (
                  <span key={t} className="ax-chip">
                    {safeText(t)}
                  </span>
                ))}
              </span>
            ) : null}
          </div>
          <p className="ax-preview__summary">{safeText(item.summary || '', '—')}</p>
          {onOpenExternal ? (
            <div className="ax-preview__actions">
              <button
                type="button"
                className="ax-btn ax-btn--primary"
                onClick={() => onOpenExternal(item.id)}
              >
                Открыть
              </button>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
};

export default PreviewPane;
