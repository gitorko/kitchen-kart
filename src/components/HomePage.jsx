import { useMemo, useState } from 'react';
import { T, SECTION_LABEL } from '../theme.js';
import DishCard from './DishCard.jsx';
import KitchenCard from './KitchenCard.jsx';
import PhotoLightbox from './PhotoLightbox.jsx';
import Badge from './Badge.jsx';

export default function HomePage({ kitchens, dishes, cart, session, onAdd, onIncrement, onDecrement, onToggleHeart, onToggleFavorite, sharedDishId, onClearShared }) {
  const [mode, setMode] = useState('all'); // 'all' | 'kitchens'
  const [selectedKitchenId, setSelectedKitchenId] = useState(null);
  const [query, setQuery] = useState('');
  const [lightbox, setLightbox] = useState(null);

  // "Currently Not Available" dishes are hidden from customers entirely — this
  // is separate from "Out of Stock", which still lists the dish (DishCard
  // shows that state itself).
  const customerDishes = dishes.filter(d => d.visible !== false);
  const sharedDish = sharedDishId ? customerDishes.find(d => d.id === sharedDishId) : null;

  const kitchenNameById = useMemo(
    () => Object.fromEntries(kitchens.map(k => [k.id, k.name])),
    [kitchens]
  );

  const isHearted = dish => !!session && (dish.heartedBy || []).includes(session.userId);
  const isFavoritedKitchen = kitchen => !!session && (kitchen.favoritedBy || []).includes(session.userId);

  const q = query.trim().toLowerCase();
  const visibleDishes = customerDishes
    .filter(d => !selectedKitchenId || d.kitchenId === selectedKitchenId)
    .filter(d => !q || d.name.toLowerCase().includes(q) || (kitchenNameById[d.kitchenId] || '').toLowerCase().includes(q))
    // Favorited (hearted by me) dishes are pinned to the top, then in-stock ones.
    .sort((a, b) => Number(isHearted(b)) - Number(isHearted(a)) || Number(b.inStock) - Number(a.inStock));

  const sortedKitchens = [...kitchens].sort((a, b) => Number(isFavoritedKitchen(b)) - Number(isFavoritedKitchen(a)));

  // While searching, group by dish name so it's obvious when several kitchens
  // are making the same thing — lets you compare price/availability side by side.
  const searchGroups = q
    ? Object.values(
        visibleDishes.reduce((acc, d) => {
          const key = d.name.trim().toLowerCase();
          (acc[key] ??= { name: d.name, dishes: [] }).dishes.push(d);
          return acc;
        }, {})
      )
    : null;

  function qtyFor(dish) {
    return cart[dish.kitchenId]?.items.find(i => i.dishId === dish.id)?.qty || 0;
  }

  const selectedKitchen = kitchens.find(k => k.id === selectedKitchenId);

  return (
    <div>
      {sharedDish && (
        <div style={{ marginBottom: 18, background: T.primaryBg, borderRadius: 16, border: `1.5px solid ${T.primary}`, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.primaryDark }}>🔗 Shared with you</div>
            <button onClick={onClearShared} style={{ background: 'none', border: 'none', fontSize: 18, color: T.primaryDark, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ maxWidth: 220 }}>
            <DishCard
              dish={sharedDish}
              kitchenName={kitchenNameById[sharedDish.kitchenId]}
              qty={qtyFor(sharedDish)}
              onAdd={() => onAdd(sharedDish)}
              onIncrement={() => onIncrement(sharedDish)}
              onDecrement={() => onDecrement(sharedDish)}
              onOpenPhoto={setLightbox}
              hearted={!!session && (sharedDish.heartedBy || []).includes(session.userId)}
              onToggleHeart={session ? () => onToggleHeart(sharedDish) : null}
            />
          </div>
        </div>
      )}

      {!selectedKitchenId && (
        <>
          <div style={{ display: 'flex', gap: 6, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, marginBottom: 12 }}>
            {[{ key: 'all', label: 'All Dishes' }, { key: 'kitchens', label: 'Browse by Kitchen' }].map(({ key, label }) => (
              <button
                key={key} onClick={() => setMode(key)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: mode === key ? T.bg : 'transparent',
                  color: mode === key ? T.text : T.textMuted,
                  fontWeight: mode === key ? 700 : 500, fontFamily: 'inherit', fontSize: 13.5,
                  boxShadow: mode === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'all' && (
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search dishes or kitchens…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10,
                border: `1.5px solid ${T.border}`, background: T.surface, color: T.text,
                fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 14,
              }}
            />
          )}
        </>
      )}

      {selectedKitchenId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => setSelectedKitchenId(null)}
            style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: T.textSub, fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
          >
            ← All Kitchens
          </button>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{selectedKitchen?.name}</div>
          {selectedKitchen?.onVacation && <Badge status="vacation" />}
        </div>
      )}

      {mode === 'kitchens' && !selectedKitchenId ? (
        kitchens.length === 0 ? (
          <EmptyState emoji="👩‍🍳" text="No kitchens yet" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {sortedKitchens.map(k => (
              <KitchenCard
                key={k.id} kitchen={k}
                dishCount={customerDishes.filter(d => d.kitchenId === k.id).length}
                onClick={() => setSelectedKitchenId(k.id)}
                favorited={isFavoritedKitchen(k)}
                onToggleFavorite={session ? () => onToggleFavorite(k) : null}
              />
            ))}
          </div>
        )
      ) : visibleDishes.length === 0 ? (
        <EmptyState emoji="🍽️" text="No dishes found" />
      ) : searchGroups ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {searchGroups.map(group => (
            <div key={group.name.toLowerCase()}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{group.name}</div>
                {group.dishes.length > 1 && (
                  <div style={{ fontSize: 12, color: T.primaryDark, background: T.primaryBg, borderRadius: 20, padding: '2px 9px', fontWeight: 700 }}>
                    {group.dishes.length} kitchens have this
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {group.dishes.map(dish => (
                  <DishCard
                    key={dish.id} dish={dish}
                    kitchenName={kitchenNameById[dish.kitchenId]}
                    qty={qtyFor(dish)}
                    onAdd={() => onAdd(dish)}
                    onIncrement={() => onIncrement(dish)}
                    onDecrement={() => onDecrement(dish)}
                    onOpenPhoto={setLightbox}
                    hearted={!!session && (dish.heartedBy || []).includes(session.userId)}
                    onToggleHeart={session ? () => onToggleHeart(dish) : null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {!selectedKitchenId && <div style={SECTION_LABEL}>All Dishes</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {visibleDishes.map(dish => (
              <DishCard
                key={dish.id} dish={dish}
                kitchenName={selectedKitchenId ? null : kitchenNameById[dish.kitchenId]}
                qty={qtyFor(dish)}
                onAdd={() => onAdd(dish)}
                onIncrement={() => onIncrement(dish)}
                onDecrement={() => onDecrement(dish)}
                onOpenPhoto={setLightbox}
                hearted={!!session && (dish.heartedBy || []).includes(session.userId)}
                onToggleHeart={session ? () => onToggleHeart(dish) : null}
              />
            ))}
          </div>
        </>
      )}

      <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

function EmptyState({ emoji, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '52px 0', border: `1.5px dashed ${T.border}`, borderRadius: 16 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.textSub }}>{text}</div>
    </div>
  );
}
