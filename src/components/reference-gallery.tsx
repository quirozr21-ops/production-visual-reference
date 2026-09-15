"use client";

import { useEffect, useMemo, useState } from "react";

type Asset = {
  id: string;
  category: string;
  description: string | null;
  image_url: string | null;
};

export function ReferenceGallery({ assets }: { assets: Asset[] }) {
  const [selected, setSelected] = useState<Asset | null>(null);
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const asset of assets) {
      counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [assets]);

  const visibleAssets = category === "all"
    ? assets
    : assets.filter((asset) => asset.category === category);

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected]);

  if (!assets.length) {
    return <div className="status warning">No approved reference photographs are available.</div>;
  }

  return (
    <>
      <div className="search-form" style={{ marginBottom: 14 }}>
        <label>
          Photo Category
          <select
            className="input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All Photos ({assets.length})</option>
            {categories.map(([name, count]) => (
              <option key={name} value={name}>{name} ({count})</option>
            ))}
          </select>
        </label>
      </div>

      <p className="muted photo-help">
        Showing {visibleAssets.length} {visibleAssets.length === 1 ? "photo" : "photos"}. Tap any photo to enlarge it.
      </p>

      <div className="gallery">
        {visibleAssets.map((asset) => (
          <article className="photo-card" key={asset.id}>
            {asset.image_url ? (
              <button
                className="photo-enlarge-button"
                type="button"
                onClick={() => setSelected(asset)}
                aria-label={`Enlarge ${asset.category} reference photo`}
              >
                {/* Approved images are served through the controlled reference-image route. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.image_url} alt={`${asset.category}: ${asset.description ?? "reference photo"}`} />
                <span className="photo-enlarge-hint" aria-hidden="true">Tap to enlarge</span>
              </button>
            ) : (
              <div className="photo-placeholder">{asset.category}<br />Photo placeholder</div>
            )}
            <div className="photo-caption">
              <div className="photo-category">{asset.category}</div>
              {asset.description ? <div className="muted">{asset.description}</div> : null}
            </div>
          </article>
        ))}
      </div>

      {selected?.image_url ? (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.category} enlarged reference photo`}
          onClick={() => setSelected(null)}
        >
          <button
            className="photo-lightbox-close"
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Close enlarged photo"
          >
            ×
          </button>
          <div className="photo-lightbox-content" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.image_url}
              alt={`${selected.category}: ${selected.description ?? "reference photo"}`}
            />
            <div className="photo-lightbox-caption">
              <strong>{selected.category}</strong>
              {selected.description ? <span>{selected.description}</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
