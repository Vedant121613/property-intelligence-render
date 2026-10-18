import React, { useState } from 'react';
import { X, Search, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TransactionsModal({
  isOpen,
  onClose,
  projectName = 'Heera Solitaire',
  transactions = { sale: [], rent: [] }
}) {
  const { unlockTxn } = useAuth();
  const [filterType, setFilterType] = useState('all');
  const [unitSearch, setUnitSearch] = useState('');
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [allUnlocked, setAllUnlocked] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  if (!isOpen) return null;

  const combined = [
    ...(transactions.sale || []),
    ...(transactions.rent || [])
  ];

  const filtered = combined.filter(item => {
    if (filterType !== 'all' && item.type && !item.type.toLowerCase().includes(filterType)) return false;
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase();
      return (
        (item.unit && item.unit.toLowerCase().includes(q)) ||
        (item.floorTower && item.floorTower.toLowerCase().includes(q)) ||
        (item.amount && item.amount.toLowerCase().includes(q)) ||
        (item.docNo && String(item.docNo).toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const getDisplayAmount = (row) => {
    const raw = row.amount || row.priceFormatted;
    if (raw && raw !== 'Rs. NaN Lac' && raw !== 'Rs. 0.00 Lac' && raw !== '-') {
      return raw.startsWith('Rs') || raw.startsWith('Rs') ? raw : `Rs ${raw}`;
    }
    if (row.price && Number(row.price) > 0) {
      const p = Number(row.price);
      return p >= 10000000 ? `Rs.${(p / 10000000).toFixed(2)} Cr` : `Rs.${(p / 100000).toFixed(2)} Lac`;
    }
    return '-';
  };

  const toggleUnlockRow = async (id) => {
    const isCurrentlyUnlocked = allUnlocked || unlockedIds.has(id);
    if (isCurrentlyUnlocked) {
      setUnlockedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      return;
    }
    setUnlockedIds(prev => new Set(prev).add(id));
    try { await unlockTxn(id); } catch {}
  };

  const handleToggleAll = () => {
    if (allUnlocked) { setAllUnlocked(false); setUnlockedIds(new Set()); }
    else { setAllUnlocked(true); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1E293B' }}>
              Registered Transactions - {projectName}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
              {filtered.length.toLocaleString()} records from IGR Pune
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input type="text" placeholder="Search unit, floor, doc no..." value={unitSearch}
                onChange={(e) => { setUnitSearch(e.target.value); setPage(0); }}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {['all', 'sale', 'rent'].map(type => (
                <button key={type} type="button" onClick={() => { setFilterType(type); setPage(0); }}
                  style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', background: filterType === type ? '#1D4ED8' : '#F1F5F9', color: filterType === type ? '#FFFFFF' : '#475569', border: 'none', cursor: 'pointer' }}>
                  {type}
                </button>
              ))}
              <button type="button" onClick={handleToggleAll}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, background: allUnlocked ? '#0F766E' : '#ECFDF5', color: allUnlocked ? '#FFFFFF' : '#065F46', border: allUnlocked ? '1px solid #0F766E' : '1px solid #A7F3D0', cursor: 'pointer' }}>
                {allUnlocked ? <Lock size={14} /> : <Unlock size={14} />}
                <span>{allUnlocked ? 'Lock All' : 'Unlock All Prices'}</span>
              </button>
            </div>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.8rem', color: '#64748B' }}>
              <span>Showing {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of <strong>{filtered.length.toLocaleString()}</strong></span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #CBD5E1', background: safePage === 0 ? '#F8FAFC' : '#fff', color: safePage === 0 ? '#94A3B8' : '#1D4ED8', fontWeight: 700, cursor: safePage === 0 ? 'default' : 'pointer', fontSize: '0.8rem' }}>Prev</button>
                <span style={{ padding: '4px 8px', fontWeight: 600 }}>Page {safePage + 1}/{totalPages}</span>
                <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #CBD5E1', background: safePage >= totalPages - 1 ? '#F8FAFC' : '#fff', color: safePage >= totalPages - 1 ? '#94A3B8' : '#1D4ED8', fontWeight: 700, cursor: safePage >= totalPages - 1 ? 'default' : 'pointer', fontSize: '0.8rem' }}>Next</button>
              </div>
            </div>
          )}

          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Floor, Tower</th><th>Unit</th><th>Amount</th></tr></thead>
              <tbody>
                {pageItems.length > 0 ? pageItems.map((row) => {
                  const isUnlocked = allUnlocked || unlockedIds.has(row.id);
                  const displayAmt = getDisplayAmount(row);
                  return (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td><span className="sale-pill">{row.type}</span></td>
                      <td>{row.floorTower}</td>
                      <td style={{ fontWeight: 600 }}>{row.unit}</td>
                      <td>
                        {isUnlocked ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleUnlockRow(row.id)}>
                            <span style={{ color: '#065F46', fontWeight: 700, fontSize: '0.9rem' }}>{displayAmt}</span>
                            <Unlock size={13} color="#059669" />
                          </div>
                        ) : (
                          <button type="button" className="locked-amount-badge" onClick={() => toggleUnlockRow(row.id)} style={{ border: 'none', cursor: 'pointer' }}>
                            <Lock size={12} /><span>Unlock Price</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>No matching records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button type="button" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: safePage === 0 ? '#F8FAFC' : '#1D4ED8', color: safePage === 0 ? '#94A3B8' : '#fff', fontWeight: 700, cursor: safePage === 0 ? 'default' : 'pointer', fontSize: '0.85rem' }}>Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pIdx = i;
                if (totalPages > 7) {
                  if (safePage < 4) pIdx = i;
                  else if (safePage > totalPages - 5) pIdx = totalPages - 7 + i;
                  else pIdx = safePage - 3 + i;
                }
                if (pIdx < 0 || pIdx >= totalPages) return null;
                return (
                  <button key={pIdx} type="button" onClick={() => setPage(pIdx)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: pIdx === safePage ? '#1D4ED8' : '#fff', color: pIdx === safePage ? '#fff' : '#475569', fontWeight: pIdx === safePage ? 800 : 500, cursor: 'pointer', fontSize: '0.85rem', minWidth: '36px' }}>
                    {pIdx + 1}
                  </button>
                );
              })}
              <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: safePage >= totalPages - 1 ? '#F8FAFC' : '#1D4ED8', color: safePage >= totalPages - 1 ? '#94A3B8' : '#fff', fontWeight: 700, cursor: safePage >= totalPages - 1 ? 'default' : 'pointer', fontSize: '0.85rem' }}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
