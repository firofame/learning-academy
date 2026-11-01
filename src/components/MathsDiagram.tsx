import React from 'react';

interface MathsDiagramProps {
  type?: string;
  className?: string;
}

export const MathsDiagram: React.FC<MathsDiagramProps> = ({ type, className = '' }) => {
  if (!type) return null;

  switch (type) {
    case 'line-pqr':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center ${className}`}>
          <svg viewBox="0 0 400 100" className="w-full max-w-md h-auto" aria-label="Line with points P, Q, and R">
            <defs>
              <marker id="arrow-both-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 10 0 L 0 5 L 10 10 z" fill="#0f172a" />
              </marker>
              <marker id="arrow-both-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
              </marker>
            </defs>
            {/* Infinite Line */}
            <line x1="30" y1="50" x2="370" y2="50" stroke="#0f172a" strokeWidth="3" markerStart="url(#arrow-both-left)" markerEnd="url(#arrow-both-right)" />
            
            {/* Point P */}
            <circle cx="100" cy="50" r="5" fill="#2563eb" />
            <text x="100" y="32" textAnchor="middle" className="text-sm font-bold fill-blue-700 font-sans">P</text>
            
            {/* Point Q */}
            <circle cx="200" cy="50" r="5" fill="#2563eb" />
            <text x="200" y="32" textAnchor="middle" className="text-sm font-bold fill-blue-700 font-sans">Q</text>
            
            {/* Point R */}
            <circle cx="300" cy="50" r="5" fill="#2563eb" />
            <text x="300" y="32" textAnchor="middle" className="text-sm font-bold fill-blue-700 font-sans">R</text>

            <text x="200" y="85" textAnchor="middle" className="text-xs fill-slate-500 font-sans">Line extending in both directions with segments PQ, QR, and PR</text>
          </svg>
        </div>
      );

    case 'fig2-arms':
    case 'fig2-all':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 ${className}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Part (i): Vertical line with 3 horizontal rays */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-2">Figure 2(i)</span>
              <svg viewBox="0 0 160 160" className="w-full max-w-[140px] h-auto">
                <defs>
                  <marker id="arr-f2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
                  </marker>
                </defs>
                {/* Vertical line extending downward */}
                <line x1="40" y1="20" x2="40" y2="140" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-f2)" />
                <circle cx="40" cy="40" r="4" fill="#2563eb" />
                <text x="25" y="44" className="text-xs font-bold fill-blue-700">A</text>
                <circle cx="40" cy="80" r="4" fill="#2563eb" />
                <text x="25" y="84" className="text-xs font-bold fill-blue-700">B</text>
                <circle cx="40" cy="120" r="4" fill="#2563eb" />
                <text x="25" y="124" className="text-xs font-bold fill-blue-700">C</text>

                {/* Ray AE */}
                <line x1="40" y1="40" x2="135" y2="40" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-f2)" />
                <circle cx="100" cy="40" r="3.5" fill="#059669" />
                <text x="100" y="30" textAnchor="middle" className="text-xs font-bold fill-emerald-700">E</text>

                {/* Ray BF */}
                <line x1="40" y1="80" x2="135" y2="80" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-f2)" />
                <circle cx="100" cy="80" r="3.5" fill="#059669" />
                <text x="100" y="70" textAnchor="middle" className="text-xs font-bold fill-emerald-700">F</text>

                {/* Ray CG */}
                <line x1="40" y1="120" x2="135" y2="120" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-f2)" />
                <circle cx="100" cy="120" r="3.5" fill="#059669" />
                <text x="100" y="110" textAnchor="middle" className="text-xs font-bold fill-emerald-700">G</text>
              </svg>
            </div>

            {/* Part (ii): W-shape */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-2">Figure 2(ii)</span>
              <svg viewBox="0 0 160 160" className="w-full max-w-[140px] h-auto">
                <defs>
                  <marker id="arr-w" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
                  </marker>
                </defs>
                {/* Ray BA */}
                <line x1="50" y1="110" x2="20" y2="25" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-w)" />
                {/* Segment BC */}
                <line x1="50" y1="110" x2="80" y2="50" stroke="#0f172a" strokeWidth="2.5" />
                {/* Segment CD */}
                <line x1="80" y1="50" x2="110" y2="110" stroke="#0f172a" strokeWidth="2.5" />
                {/* Ray DE */}
                <line x1="110" y1="110" x2="140" y2="25" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-w)" />

                <circle cx="30" cy="50" r="3.5" fill="#059669" />
                <text x="18" y="55" className="text-xs font-bold fill-emerald-700">A</text>
                <circle cx="50" cy="110" r="4" fill="#2563eb" />
                <text x="45" y="128" className="text-xs font-bold fill-blue-700">B</text>
                <circle cx="80" cy="50" r="4" fill="#2563eb" />
                <text x="76" y="38" className="text-xs font-bold fill-blue-700">C</text>
                <circle cx="110" cy="110" r="4" fill="#2563eb" />
                <text x="105" y="128" className="text-xs font-bold fill-blue-700">D</text>
                <circle cx="130" cy="50" r="3.5" fill="#059669" />
                <text x="140" y="55" className="text-xs font-bold fill-emerald-700">E</text>
              </svg>
            </div>

            {/* Part (iii): Slanted QR with rays */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-2">Figure 2(iii)</span>
              <svg viewBox="0 0 160 160" className="w-full max-w-[140px] h-auto">
                <defs>
                  <marker id="arr-qr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
                  </marker>
                </defs>
                {/* Ray QP left */}
                <line x1="110" y1="40" x2="20" y2="40" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-qr)" />
                {/* Segment QR slanted */}
                <line x1="110" y1="40" x2="50" y2="120" stroke="#0f172a" strokeWidth="2.5" />
                {/* Ray RS right */}
                <line x1="50" y1="120" x2="140" y2="120" stroke="#0f172a" strokeWidth="2.5" markerEnd="url(#arr-qr)" />

                <circle cx="50" cy="40" r="3.5" fill="#059669" />
                <text x="50" y="30" textAnchor="middle" className="text-xs font-bold fill-emerald-700">P</text>
                <circle cx="110" cy="40" r="4" fill="#2563eb" />
                <text x="122" y="44" className="text-xs font-bold fill-blue-700">Q</text>
                <circle cx="50" cy="120" r="4" fill="#2563eb" />
                <text x="35" y="124" className="text-xs font-bold fill-blue-700">R</text>
                <circle cx="110" cy="120" r="3.5" fill="#059669" />
                <text x="110" y="138" textAnchor="middle" className="text-xs font-bold fill-emerald-700">S</text>
              </svg>
            </div>
          </div>
        </div>
      );

    case 'cuboid':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center ${className}`}>
          <svg viewBox="0 0 340 240" className="w-full max-w-sm h-auto" aria-label="3D Cuboid ABCD-PQRS">
            {/* Back face dashed edges */}
            <line x1="110" y1="60" x2="250" y2="60" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="110" y1="60" x2="110" y2="170" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="110" y1="170" x2="250" y2="170" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50" y1="190" x2="110" y2="170" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

            {/* Front and side faces */}
            {/* Front Face: C (50,90) - A (190,90) - D (190,190) - R (50,190) */}
            <polygon points="50,90 190,90 190,190 50,190" fill="#3b82f6" fillOpacity="0.08" stroke="#1e293b" strokeWidth="2.5" />
            
            {/* Top Face: P (110,60) - B (250,60) - A (190,90) - C (50,90) */}
            <polygon points="110,60 250,60 190,90 50,90" fill="#10b981" fillOpacity="0.08" stroke="#1e293b" strokeWidth="2.5" />
            
            {/* Right Face: B (250,60) - S (250,170) - D (190,190) - A (190,90) */}
            <polygon points="250,60 250,170 190,190 190,90" fill="#f59e0b" fillOpacity="0.08" stroke="#1e293b" strokeWidth="2.5" />

            {/* Left face connecting PC and QR */}
            <line x1="110" y1="60" x2="50" y2="90" stroke="#1e293b" strokeWidth="2.5" />
            <line x1="110" y1="170" x2="50" y2="190" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

            {/* Vertices */}
            {/* P (top left back) */}
            <circle cx="110" cy="60" r="4" fill="#0f172a" />
            <text x="105" y="50" textAnchor="end" className="text-xs font-bold fill-slate-900">P</text>
            
            {/* B (top right back) */}
            <circle cx="250" cy="60" r="4" fill="#0f172a" />
            <text x="260" y="55" className="text-xs font-bold fill-slate-900">B</text>

            {/* C (top left front) */}
            <circle cx="50" cy="90" r="4.5" fill="#2563eb" />
            <text x="35" y="90" textAnchor="end" className="text-xs font-bold fill-blue-700">C</text>

            {/* A (top right front) */}
            <circle cx="190" cy="90" r="4.5" fill="#2563eb" />
            <text x="198" y="85" className="text-xs font-bold fill-blue-700">A</text>

            {/* Q (bottom left back) */}
            <circle cx="110" cy="170" r="4" fill="#64748b" />
            <text x="96" y="172" className="text-xs font-bold fill-slate-600">Q</text>

            {/* S (bottom right back) */}
            <circle cx="250" cy="170" r="4" fill="#0f172a" />
            <text x="262" y="175" className="text-xs font-bold fill-slate-900">S</text>

            {/* R (bottom left front) */}
            <circle cx="50" cy="190" r="4.5" fill="#2563eb" />
            <text x="36" y="202" className="text-xs font-bold fill-blue-700">R</text>

            {/* D (bottom right front) */}
            <circle cx="190" cy="190" r="4.5" fill="#2563eb" />
            <text x="198" y="205" className="text-xs font-bold fill-blue-700">D</text>

            <text x="170" y="230" textAnchor="middle" className="text-xs fill-slate-500 font-sans">8 Vertices · 6 Planes (Faces) · 12 Edges</text>
          </svg>
        </div>
      );

    case 'parallel-transversals':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center ${className}`}>
          <svg viewBox="0 0 400 240" className="w-full max-w-md h-auto" aria-label="Parallel lines l, m, n intersected by transversals p, q, r">
            <defs>
              <marker id="arr-pt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
              </marker>
              <marker id="arr-pt-rev" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 10 0 L 0 5 L 10 10 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Parallel lines l, m, n */}
            {/* Line l */}
            <line x1="30" y1="50" x2="370" y2="50" stroke="#0f172a" strokeWidth="2.5" markerStart="url(#arr-pt-rev)" markerEnd="url(#arr-pt)" />
            <text x="380" y="55" className="text-sm font-bold fill-indigo-700 font-serif">l</text>

            {/* Line m */}
            <line x1="30" y1="120" x2="370" y2="120" stroke="#0f172a" strokeWidth="2.5" markerStart="url(#arr-pt-rev)" markerEnd="url(#arr-pt)" />
            <text x="380" y="125" className="text-sm font-bold fill-indigo-700 font-serif">m</text>

            {/* Line n */}
            <line x1="30" y1="190" x2="370" y2="190" stroke="#0f172a" strokeWidth="2.5" markerStart="url(#arr-pt-rev)" markerEnd="url(#arr-pt)" />
            <text x="380" y="195" className="text-sm font-bold fill-indigo-700 font-serif">n</text>

            {/* Transversal lines p, q, r */}
            {/* Transversal q: steep right slanted */}
            <line x1="70" y1="15" x2="160" y2="225" stroke="#dc2626" strokeWidth="2" markerStart="url(#arr-pt-rev)" markerEnd="url(#arr-pt)" />
            <text x="60" y="20" className="text-sm font-bold fill-rose-600 font-serif">q</text>

            {/* Transversal p: center right slanted */}
            <line x1="160" y1="15" x2="260" y2="225" stroke="#059669" strokeWidth="2" markerStart="url(#arr-pt-rev)" markerEnd="url(#arr-pt)" />
            <text x="155" y="15" className="text-sm font-bold fill-emerald-600 font-serif">p</text>

            {/* Transversal r: right slanted */}
            <line x1="260" y1="15" x2="340" y2="225" stroke="#d97706" strokeWidth="2" markerStart="url(#arr-pt-rev)" markerEnd="url(#arr-pt)" />
            <text x="255" y="15" className="text-sm font-bold fill-amber-600 font-serif">r</text>

            {/* Key Intersection Points */}
            {/* Point P: intersection of line l (y=50) and line q (x=85) */}
            <circle cx="85" cy="50" r="4" fill="#2563eb" />
            <text x="75" y="44" className="text-xs font-bold fill-blue-700">P</text>

            {/* Point S: intersection of line l (y=50) and line r (x=273) */}
            <circle cx="273" cy="50" r="4" fill="#2563eb" />
            <text x="282" y="44" className="text-xs font-bold fill-blue-700">S</text>

            {/* Point I: intersection of line m (y=120) and line p (x=210) */}
            <circle cx="210" cy="120" r="4" fill="#2563eb" />
            <text x="200" y="112" className="text-xs font-bold fill-blue-700">I</text>

            {/* Point T: intersection of line m (y=120) and line r (x=300) */}
            <circle cx="300" cy="120" r="4" fill="#2563eb" />
            <text x="310" y="115" className="text-xs font-bold fill-blue-700">T</text>
          </svg>
        </div>
      );

    case 'line-m-t':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center ${className}`}>
          <svg viewBox="0 0 340 180" className="w-full max-w-sm h-auto" aria-label="Lines l, m, and t with points P, Q, R, S">
            <defs>
              <marker id="arr-mt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
              </marker>
              <marker id="arr-mt-rev" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 10 0 L 0 5 L 10 10 z" fill="#0f172a" />
              </marker>
            </defs>
            {/* Horizontal Line l */}
            <line x1="30" y1="130" x2="310" y2="130" stroke="#0f172a" strokeWidth="2.5" markerStart="url(#arr-mt-rev)" markerEnd="url(#arr-mt)" />
            <text x="320" y="135" className="text-sm font-bold fill-slate-700 font-serif">l</text>

            {/* Point P, Q, R on line l */}
            <circle cx="80" cy="130" r="4" fill="#2563eb" />
            <text x="80" y="150" textAnchor="middle" className="text-xs font-bold fill-blue-700">P</text>

            <circle cx="160" cy="130" r="4" fill="#2563eb" />
            <text x="160" y="150" textAnchor="middle" className="text-xs font-bold fill-blue-700">Q</text>

            <circle cx="240" cy="130" r="4" fill="#2563eb" />
            <text x="240" y="150" textAnchor="middle" className="text-xs font-bold fill-blue-700">R</text>

            {/* Line m passing through S and P */}
            <line x1="200" y1="20" x2="40" y2="165" stroke="#0284c7" strokeWidth="2" markerStart="url(#arr-mt-rev)" markerEnd="url(#arr-mt)" />
            <text x="30" y="175" className="text-sm font-bold fill-sky-700 font-serif">m</text>

            {/* Line t passing through S and R */}
            <line x1="120" y1="20" x2="280" y2="165" stroke="#d97706" strokeWidth="2" markerStart="url(#arr-mt-rev)" markerEnd="url(#arr-mt)" />
            <text x="290" y="175" className="text-sm font-bold fill-amber-700 font-serif">t</text>

            {/* Vertex S at intersection of line m and line t */}
            <circle cx="160" cy="56" r="4.5" fill="#dc2626" />
            <text x="160" y="44" textAnchor="middle" className="text-xs font-bold fill-rose-700">S</text>
          </svg>
        </div>
      );

    case 'open-closed':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 ${className}`}>
          <p className="text-xs font-bold uppercase text-slate-500 tracking-wide text-center">Eight Figures of Question 6</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* (i) Open curve */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(i)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <path d="M 15 45 C 20 15, 60 15, 65 45" fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
              <span className="text-[11px] font-bold text-amber-700 mt-1">Open figure</span>
            </div>

            {/* (ii) Boat closed */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(ii)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <path d="M 15 25 Q 40 50 65 25 Q 40 10 15 25 Z" fill="#ecfdf5" stroke="#059669" strokeWidth="3" />
              </svg>
              <span className="text-[11px] font-bold text-emerald-700 mt-1">Closed figure</span>
            </div>

            {/* (iii) Looping open */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(iii)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <path d="M 20 50 Q 20 15 40 25 Q 60 35 60 50" fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
              <span className="text-[11px] font-bold text-amber-700 mt-1">Open figure</span>
            </div>

            {/* (iv) Figure 8 closed */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(iv)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <ellipse cx="30" cy="30" rx="15" ry="18" fill="#ecfdf5" stroke="#059669" strokeWidth="2.5" />
                <ellipse cx="50" cy="30" rx="15" ry="18" fill="#ecfdf5" stroke="#059669" strokeWidth="2.5" />
              </svg>
              <span className="text-[11px] font-bold text-emerald-700 mt-1">Closed figure</span>
            </div>

            {/* (v) U shape open */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(v)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <path d="M 20 15 L 20 40 Q 40 55 60 40 L 60 15" fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
              <span className="text-[11px] font-bold text-amber-700 mt-1">Open figure</span>
            </div>

            {/* (vi) Rectangle closed */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(vi)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <rect x="20" y="15" width="40" height="30" fill="#ecfdf5" stroke="#059669" strokeWidth="3" transform="rotate(-10 40 30)" />
              </svg>
              <span className="text-[11px] font-bold text-emerald-700 mt-1">Closed figure</span>
            </div>

            {/* (vii) Zigzag open */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(vii)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <polyline points="15,45 30,15 45,45 65,20" fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
              <span className="text-[11px] font-bold text-amber-700 mt-1">Open figure</span>
            </div>

            {/* (viii) Bowtie polygon closed */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">(viii)</span>
              <svg viewBox="0 0 80 60" className="w-16 h-12">
                <polygon points="15,15 65,45 65,15 15,45" fill="#ecfdf5" stroke="#059669" strokeWidth="2.5" />
              </svg>
              <span className="text-[11px] font-bold text-emerald-700 mt-1">Closed figure</span>
            </div>
          </div>
        </div>
      );

    case 'regions':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center ${className}`}>
          <svg viewBox="0 0 360 220" className="w-full max-w-sm h-auto" aria-label="Closed region showing interior points K L M N, boundary points P Q R S, and exterior points A B C D">
            {/* Closed curved boundary */}
            <path
              d="M 90 70 C 130 30, 230 40, 270 80 C 310 120, 260 180, 190 190 C 120 200, 60 160, 70 110 Z"
              fill="#dbeafe"
              fillOpacity="0.4"
              stroke="#2563eb"
              strokeWidth="3.5"
            />

            {/* Interior Points: K, L, M, N */}
            <circle cx="140" cy="90" r="4" fill="#1e3a8a" />
            <text x="140" y="80" textAnchor="middle" className="text-xs font-bold fill-blue-900">K</text>

            <circle cx="210" cy="95" r="4" fill="#1e3a8a" />
            <text x="210" y="85" textAnchor="middle" className="text-xs font-bold fill-blue-900">L</text>

            <circle cx="150" cy="140" r="4" fill="#1e3a8a" />
            <text x="150" y="155" textAnchor="middle" className="text-xs font-bold fill-blue-900">M</text>

            <circle cx="215" cy="145" r="4" fill="#1e3a8a" />
            <text x="215" y="160" textAnchor="middle" className="text-xs font-bold fill-blue-900">N</text>

            {/* Boundary Points: P, Q, R, S */}
            <circle cx="180" cy="46" r="4.5" fill="#dc2626" />
            <text x="180" y="38" textAnchor="middle" className="text-xs font-bold fill-rose-700">P</text>

            <circle cx="288" cy="122" r="4.5" fill="#dc2626" />
            <text x="302" y="125" className="text-xs font-bold fill-rose-700">Q</text>

            <circle cx="160" cy="194" r="4.5" fill="#dc2626" />
            <text x="160" y="210" textAnchor="middle" className="text-xs font-bold fill-rose-700">R</text>

            <circle cx="68" cy="115" r="4.5" fill="#dc2626" />
            <text x="54" y="118" textAnchor="end" className="text-xs font-bold fill-rose-700">S</text>

            {/* Exterior Points: A, B, C, D */}
            <circle cx="40" cy="50" r="4" fill="#059669" />
            <text x="40" y="40" textAnchor="middle" className="text-xs font-bold fill-emerald-800">A</text>

            <circle cx="320" cy="55" r="4" fill="#059669" />
            <text x="320" y="45" textAnchor="middle" className="text-xs font-bold fill-emerald-800">B</text>

            <circle cx="330" cy="190" r="4" fill="#059669" />
            <text x="330" y="180" textAnchor="middle" className="text-xs font-bold fill-emerald-800">C</text>

            <circle cx="45" cy="190" r="4" fill="#059669" />
            <text x="45" y="180" textAnchor="middle" className="text-xs font-bold fill-emerald-800">D</text>

            {/* Region Legend */}
            <text x="180" y="120" textAnchor="middle" className="text-xs font-semibold fill-blue-800/80">INTERIOR</text>
          </svg>
          <div className="flex flex-wrap gap-4 text-xs font-medium mt-1">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-900" /> Interior: K, L, M, N</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Boundary: P, Q, R, S</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-700" /> Exterior: A, B, C, D</span>
          </div>
        </div>
      );

    case 'mcq-rays':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center ${className}`}>
          <svg viewBox="0 0 320 80" className="w-full max-w-xs h-auto" aria-label="Ray AB">
            <defs>
              <marker id="arr-ray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
              </marker>
            </defs>
            <line x1="60" y1="40" x2="280" y2="40" stroke="#0f172a" strokeWidth="3" markerEnd="url(#arr-ray)" />
            {/* Fixed origin A */}
            <circle cx="60" cy="40" r="5" fill="#2563eb" />
            <text x="60" y="24" textAnchor="middle" className="text-sm font-bold fill-blue-700">A</text>
            
            {/* Point B */}
            <circle cx="170" cy="40" r="4.5" fill="#2563eb" />
            <text x="170" y="24" textAnchor="middle" className="text-sm font-bold fill-blue-700">B</text>
          </svg>
        </div>
      );

    case 'mcq-line':
      return (
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center ${className}`}>
          <svg viewBox="0 0 340 80" className="w-full max-w-sm h-auto" aria-label="Ray AD with points B and D">
            <defs>
              <marker id="arr-line-q" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
              </marker>
            </defs>
            <line x1="50" y1="40" x2="300" y2="40" stroke="#0f172a" strokeWidth="3" markerEnd="url(#arr-line-q)" />
            {/* Point A (origin) */}
            <circle cx="50" cy="40" r="5" fill="#2563eb" />
            <text x="50" y="24" textAnchor="middle" className="text-sm font-bold fill-blue-700">A</text>
            
            {/* Point B */}
            <circle cx="150" cy="40" r="4.5" fill="#2563eb" />
            <text x="150" y="24" textAnchor="middle" className="text-sm font-bold fill-blue-700">B</text>

            {/* Point D */}
            <circle cx="240" cy="40" r="4.5" fill="#2563eb" />
            <text x="240" y="24" textAnchor="middle" className="text-sm font-bold fill-blue-700">D</text>
          </svg>
        </div>
      );

    default:
      return null;
  }
};
