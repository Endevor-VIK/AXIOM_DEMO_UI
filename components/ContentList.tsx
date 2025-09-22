import React from 'react';
import { safeText, classNames, formatDate } from './utils';

export type ContentItem = {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  createdAt?: string;
};

type ContentListProps = {
  items: ContentItem[];
  selectedId?: string;
  onSelect: (item: ContentItem) => void;
};

export const ContentList: React.FC<ContentListProps> = ({ items, selectedId, onSelect }) => {
  const hasItems = items && items.length > 0;

  return (
    <div className="ax-content-list" role="listbox" aria-label="Список материалов">
      {hasItems
        ? items.map((it) => {
            const isSelected = it.id === selectedId;
            return (
              <article key={it.id} className={classNames('ax-content-card', isSelected ? 'is-selected' : '')}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="ax-content-card__btn"
                  onClick={() => onSelect(it)}
                >
                  <div className="ax-content-card__title">{safeText(it.title)}</div>
                  <div className="ax-content-card__meta">
                    <span className="ax-content-card__date">{formatDate(it.createdAt)}</span>
                    {it.tags && it.tags.length > 0 ? (
                      <span className="ax-content-card__tags">
                        {it.tags.slice(0, 3).map((t) => (
                          <span key={t} className="ax-chip">
                            {safeText(t)}
                          </span>
                        ))}
                        {it.tags.length > 3 ? <span className="ax-chip ax-chip--more">+{it.tags.length - 3}</span> : null}
                      </span>
                    ) : null}
                  </div>
                  <p className="ax-content-card__summary">
                    {safeText(it.summary || '', '—')}
                  </p>
                </button>
              </article>
            );
          })
        : Array.from({ length: 3 }).map((_, i) => (
            <article key={i} className="ax-content-card">
              <div className="ax-content-card__btn" aria-hidden="true">
                <div className="ax-skeleton ax-skeleton--text" style={{ width: '60%' }} />
                <div className="ax-skeleton ax-skeleton--text" style={{ width: '35%', marginTop: 8 }} />
                <div className="ax-skeleton ax-skeleton--block" style={{ height: 48, marginTop: 12 }} />
              </div>
            </article>
          ))}
    </div>
  );
};

export default ContentList;
