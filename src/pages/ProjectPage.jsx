import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Package, 
  Info, 
  ArrowDown, 
  Search, 
  ChevronRight,
  Zap,
  ChevronDown,
  Lock,
  Unlock
} from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import TransactionsTable from '../components/TransactionsTable';
import EmptyState from '../components/EmptyState';
import TransactionsModal from '../components/TransactionsModal';
import ProjectCard from '../components/ProjectCard';
import { getProjectDetails } from '../services/propertyService';
import { useAuth } from '../context/AuthContext';
import kharadiData from '../data/kharadiData.json';

export default function ProjectPage({
  cityId = 'pune',
  localityId = 'saswad-road',
  projectId = 'heera-solitaire',
  talukaId,
  villageName,
  talukaName,
  onNavigate
}) {
  const { isAuthenticated, openAuthModal, unlockTxn, isTxnUnlocked, freeAttemptsLeft, isPaymentDone } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllTxnsModal, setShowAllTxnsModal] = useState(false);
  const [bhkFilter, setBhkFilter] = useState('all');
  const [unlockedLastSold, setUnlockedLastSold] = useState(false);
  const [allModalTransactions, setAllModalTransactions] = useState({ sale: [], rent: [] });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getProjectDetails(projectId, talukaId, localityId)
      .then(res => {
        if (isMounted) {
          setProject(res);
          setLoading(false);

          // Load ALL transactions from kharadiData.json for the modal
          const kMatch = kharadiData.projects?.find(p =>
            p.id === projectId ||
            p.slug === projectId ||
            p.id === res.id ||
            p.slug === res.id ||
            p.name === res.name ||
            (p.aliases && p.aliases.includes(projectId))
          );
          if (kMatch && kMatch.recentTransactions && kMatch.recentTransactions.length > 0) {
            const allSaleTxns = kMatch.recentTransactions.map(t => ({
              id: t.id,
              date: t.date || '-',
              type: t.docType || t.type || 'Agreement to Sale',
              floorTower: t.floorTower || `Floor ${t.floor || '-'}, ${t.building || 'Wing A'}`,
              unit: t.unit || 'Residential Unit',
              amount: t.priceFormatted || t.amount || '-',
              purchaser: t.purchaser,
              seller: t.seller,
              docNo: t.docNo,
              carpetArea: t.carpetArea,
              isLocked: true,
              project: kMatch.name
            }));
            if (isMounted) setAllModalTransactions({ sale: allSaleTxns, rent: [] });
          } else {
            // fallback to what came from the API
            if (isMounted) setAllModalTransactions(res.transactions || { sale: [], rent: [] });
          }
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [projectId, talukaId, localityId]);

  if (loading || !project) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
        Loading project details for {projectId}...
      </div>
    );
  }

  const cityName = project.city || (cityId.charAt(0).toUpperCase() + cityId.slice(1));
  const localityName = villageName || project.locality || 'Saswad Road';
  const talName = talukaName || project.taluka;

  const breadcrumbs = [
    { label: 'Home', target: { page: 'home', params: {} } },
    { label: cityName, target: { page: 'city', params: { cityId } } }
  ];

  if (talName) {
    breadcrumbs.push({ label: `${talName} Taluka`, target: { page: 'city', params: { cityId } } });
  }
  breadcrumbs.push({ label: localityName, target: { page: 'city', params: { cityId } } });
  breadcrumbs.push({ label: project.name });

  return (
    <main className="project-detail-section">
      <div className="content-wrapper">
        {/* Breadcrumb Trail */}
        <div style={{ marginBottom: '18px' }}>
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
        </div>

        {/* Project Header Overview Card (Matches Screenshot 3) */}
        <div className="project-overview-card">
          <div className="project-title-header">
            <div className="project-logo-badge">
              <Building2 size={24} />
            </div>
            <div className="project-name-area">
              <h1>{project.name}</h1>
              <p>{localityName}</p>
            </div>
          </div>

          <div className="project-body-grid">
            {/* Photo Placeholder (Screenshot 3: Cube icon + No photos Available) */}
            <div className="photo-placeholder-box">
              <Package size={32} strokeWidth={1.5} color="#94A3B8" />
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>No photos Available</span>
            </div>

            {/* Specifications Grid */}
            <div className="specs-grid">
              <div className="spec-cell">
                <span className="spec-label">Total Units</span>
                <span className="spec-value">{project.totalUnits}</span>
              </div>

              <div className="spec-cell">
                <span className="spec-label">
                  Sold Units
                  <Info size={12} color="#94A3B8" />
                </span>
                <span className="spec-value">{project.soldUnits}</span>
              </div>

              <div className="spec-cell">
                <span className="spec-label">
                  Completion
                  <Info size={12} color="#94A3B8" />
                </span>
                <span className="spec-value">{project.completion}</span>
              </div>

              <div className="spec-cell">
                <span className="spec-label">BHKs</span>
                <span className="spec-value">{project.bhks || '1, 2'}</span>
              </div>

              <div className="spec-cell">
                <span className="spec-label">Quoted Pricing</span>
                <span className="spec-value">{project.quotedPricing}</span>
              </div>

              <div className="spec-cell">
                <span className="spec-label">Developer</span>
                <span className="spec-value">{project.developer}</span>
              </div>

              <div className="spec-cell">
                <span className="spec-label">RERA Number(s)</span>
                <span className="spec-value">{project.reraNumbers || project.rera || '-'}</span>
              </div>
            </div>
          </div>

          {/* Last Sold Highlight Banner (Screenshot 3) */}
          {project.lastSold && (
            <div className="last-sold-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="#D97706" />
                {unlockedLastSold ? (
                  <span style={{ fontWeight: 700, color: '#047857' }}>
                    Last sold - {project.lastSold.date} - {project.lastSold.amount}
                  </span>
                ) : (
                  <span>
                    Last sold - {project.lastSold.date} - ••••••••••
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (unlockedLastSold) {
                    setUnlockedLastSold(false);
                    return;
                  }
                  setUnlockedLastSold(true);
                  try {
                    await unlockTxn('last-sold-' + project.id);
                  } catch {}
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: unlockedLastSold ? '#ECFDF5' : '#FFFBEB',
                  color: unlockedLastSold ? '#047857' : '#B45309',
                  border: unlockedLastSold ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={unlockedLastSold ? "Price unlocked (Click to lock)" : "Price locked (Click to unlock directly)"}
              >
                {unlockedLastSold ? <Unlock size={13} /> : <Lock size={13} />}
                <span>{unlockedLastSold ? 'Price Unlocked' : 'Unlock Price'}</span>
              </button>
            </div>
          )}
        </div>

        {/* BHK Analysis Section (Screenshot 3) */}
        {project.bhkAnalysis && (
          <div className="bhk-analysis-card">
            <div className="bhk-analysis-header">
              <div className="bhk-title-group">
                <h2>{project.name} BHK Analysis</h2>
                <div title="Analysis based on registered agreements" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                  <Info size={14} color="#64748B" />
                </div>
                <div className="bhk-select-wrapper">
                  <select 
                    value={bhkFilter} 
                    onChange={(e) => setBhkFilter(e.target.value)}
                    className="bhk-filter-select"
                    aria-label="Filter BHK Analysis"
                  >
                    <option value="all">All</option>
                    <option value="1bhk">1 BHK</option>
                    <option value="2bhk">2 BHK</option>
                  </select>
                </div>
              </div>

              <div className="bhk-meta-group">
                <span className="bhk-updated-stamp">
                  {project.bhkAnalysis.updatedDate || 'Last Updated on MahaRERA - Jan 2025'}
                </span>
                <span className="bhk-disclaimer-btn">
                  <Info size={13} />
                  <span>Disclaimer</span>
                </span>
              </div>
            </div>

            <div className="bhk-analysis-body">
              {/* Donut Progress Meter */}
              <div className="bhk-donut-metric-row">
                <div className="bhk-donut-graphic">
                  <svg width="76" height="76" viewBox="0 0 76 76">
                    <circle
                      cx="38"
                      cy="38"
                      r="32"
                      fill="none"
                      stroke="#E0F2FE"
                      strokeWidth="7"
                    />
                    <circle
                      cx="38"
                      cy="38"
                      r="32"
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="7"
                      strokeDasharray="201"
                      strokeDashoffset={201 * (1 - (project.bhkAnalysis.soldPercentage || 34) / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 38 38)"
                    />
                    <text
                      x="38"
                      y="43"
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="800"
                      fill="#0369A1"
                    >
                      {project.bhkAnalysis.soldPercentage || 34}%
                    </text>
                  </svg>
                </div>

                <div className="bhk-donut-summary">
                  <span className="bhk-units-label">UNITS SOLD</span>
                  <span className="bhk-units-count">
                    {project.bhkAnalysis.unitsSoldSummary || '1,301 of 3,836'}
                  </span>
                </div>
              </div>

              {/* BHK Breakdown Table */}
              <div className="bhk-table-container">
                <table className="bhk-breakdown-table">
                  <thead>
                    <tr>
                      <th>BHK</th>
                      <th>TOTAL UNITS</th>
                      <th>UNITS SOLD</th>
                      <th>% UNITS SOLD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project.bhkAnalysis.breakdown || [])
                      .filter(item => bhkFilter === 'all' || item.bhk.toLowerCase().replace(/\s+/g, '') === bhkFilter)
                      .map((row, idx) => (
                        <tr key={idx}>
                          <td className="bhk-cell-bold">{row.bhk}</td>
                          <td>{row.totalUnits}</td>
                          <td>{row.unitsSold}</td>
                          <td className="bhk-cell-pct">{row.percentage}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Not finding what you are looking for Banner */}
        <div className="callout-search-banner">
          <div className="callout-left">
            <Search size={22} color="#0284C7" />
            <span>Not finding what you are looking for?</span>
          </div>
          <button 
            type="button" 
            className="callout-btn"
            onClick={() => onNavigate('locality', { cityId, localityId })}
          >
            Search here
          </button>
        </div>

        {/* Recent Transactions Section */}
        <TransactionsTable
          transactions={project.transactions}
          totalTransactionsCount={allModalTransactions.sale.length || project.totalTransactionsCount || 0}
          onViewAllClick={() => setShowAllTxnsModal(true)}
          onNavigate={onNavigate}
        />

        {/* Litigations Section */}
        <div className="info-card-section">
          <div className="info-card-header">
            <h2>Litigations related to {project.name}</h2>
            <span className="info-card-count">Total cases: -</span>
          </div>
          <EmptyState title="No Data found" />
        </div>

        {/* RERA Complaints Section */}
        <div className="info-card-section">
          <div className="info-card-header">
            <h2>RERA complaints for {project.name}</h2>
            <span className="info-card-count">Total complaints: -</span>
          </div>
          <EmptyState title="No Data found" />
        </div>

        {/* Trending Projects in Locality Section */}
        {project.trendingProjectsInLocality && project.trendingProjectsInLocality.length > 0 && (
          <div className="trending-projects-section">
            <h2>Trending projects in {localityName}</h2>
            <div className="cards-grid-3">
              {project.trendingProjectsInLocality.map((item) => (
                <ProjectCard
                  key={item.id}
                  project={item}
                  onClick={() => onNavigate('project', { 
                    cityId, 
                    localityId, 
                    projectId: item.id 
                  })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Transactions Modal */}
      <TransactionsModal
        isOpen={showAllTxnsModal}
        onClose={() => setShowAllTxnsModal(false)}
        projectName={project.name}
        transactions={allModalTransactions}
      />
    </main>
  );
}
