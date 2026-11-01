import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { formatCurrency } from '../utils/csvParser';
import { Search, Tag, FileText, ChevronLeft, ChevronRight, StickyNote, X, Filter } from 'lucide-react';

const ITEMS_PER_PAGE = 50;

const MOVEMENT_TYPES = [
    { id: 'Gasto', label: 'Gastos', dot: 'bg-red-500' },
    { id: 'Ingreso', label: 'Ingresos', dot: 'bg-green-500' },
    { id: 'No computable', label: 'No computables', dot: 'bg-slate-400' }
];

const ConceptExplorer = ({ data, allData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchType, setSearchType] = useState('concept'); // 'concept' or 'category'
    const [currentPage, setCurrentPage] = useState(1);
    const [isContextualSearch, setIsContextualSearch] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState(null);
    const [activeNoteIndex, setActiveNoteIndex] = useState(null); // Track active note popup

    // Movement types filter state: all active by default
    const [selectedTypes, setSelectedTypes] = useState(() => new Set(['Gasto', 'Ingreso', 'No computable']));

    const toggleType = (typeId) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(typeId)) {
                next.delete(typeId);
            } else {
                next.add(typeId);
            }
            return next;
        });
        setCurrentPage(1);
        setSelectedMonth(null); // Reset month filter when changing type filters
        setActiveNoteIndex(null);
    };

    // Get unique items based on search type
    const uniqueItems = useMemo(() => {
        // Use allData for categories if available to show full list. For concepts, use filtered data or allData depending on need.
        const sourceData = searchType === 'category' ? (allData || data) : data;

        const items = new Map();
        const field = searchType === 'concept' ? 'Concepto' : 'Categoría';

        sourceData.forEach(d => {
            // Respect selected movement types if filter is active
            if (selectedTypes.size > 0 && !selectedTypes.has(d['Tipo de movimiento'])) {
                return;
            }

            if (d[field]) {
                const count = items.get(d[field]) || 0;
                items.set(d[field], count + 1);
            }
        });

        // Convert to array and sort
        const sortedItems = [...items.entries()]
            .sort((a, b) => {
                // For categories, sort alphabetically for easier finding in dropdown
                if (searchType === 'category') {
                    return a[0].localeCompare(b[0]);
                }
                // For concepts, keep consistency with frequency sort
                return b[1] - a[1];
            })
            .map(entry => entry[0]);

        // If category mode, return ALL items (no limit)
        if (searchType === 'category') {
            return sortedItems;
        }

        // For concepts, keep existing limit logic
        if (!searchTerm) return sortedItems.slice(0, 20); // Show top 20 by default
        return sortedItems.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
    }, [data, allData, searchTerm, searchType, selectedTypes]);

    // 1. First, filter by Search Term / Category (Base Data) and Movement Type
    const searchResults = useMemo(() => {
        const field = searchType === 'concept' ? 'Concepto' : 'Categoría';
        let filtered = [...data];

        // Filter by Type of Movement
        if (selectedTypes.size === 0) {
            return [];
        }
        filtered = filtered.filter(d => selectedTypes.has(d['Tipo de movimiento']));

        if (selectedItem) {
            filtered = filtered.filter(d => d[field] === selectedItem);
        } else if (searchTerm && isContextualSearch) {
            filtered = filtered.filter(d => d[field] && d[field].toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // Sort by date descending
        return filtered.sort((a, b) => b.parsedDate - a.parsedDate);
    }, [data, searchTerm, selectedItem, searchType, isContextualSearch, selectedTypes]);

    // 2. Generate Chart Data from Search Results
    const chartData = useMemo(() => {
        const monthlyAgg = {};
        searchResults.forEach(d => {
            const key = `${d.year}-${String(d.month + 1).padStart(2, '0')}`;
            if (!monthlyAgg[key]) monthlyAgg[key] = { name: key, amount: 0 };
            monthlyAgg[key].amount += d.parsedImporte;
        });

        return Object.values(monthlyAgg)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(item => ({
                ...item,
                amount: Math.abs(item.amount),
                originalAmount: item.amount
            }));
    }, [searchResults]);

    // 3. Filter Transactions for Table (based on Chart Selection)
    const tableTransactions = useMemo(() => {
        if (!selectedMonth) return searchResults;

        return searchResults.filter(d => {
            const key = `${d.year}-${String(d.month + 1).padStart(2, '0')}`;
            return key === selectedMonth;
        });
    }, [searchResults, selectedMonth]);

    // Pagination Logic
    const totalPages = Math.ceil(tableTransactions.length / ITEMS_PER_PAGE);
    const currentTransactions = tableTransactions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        setSearchTerm(item);
        setIsContextualSearch(false); // Exact match mode
        setCurrentPage(1);
        setSelectedMonth(null); // Reset chart filter
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            setSelectedItem(null); // Clear exact selection
            setIsContextualSearch(true); // Enable contextual search
            setCurrentPage(1);
            setSelectedMonth(null); // Reset chart filter
        }
    };

    const toggleSearchType = (type) => {
        setSearchType(type);
        setSearchTerm('');
        setSelectedItem(null);
        setIsContextualSearch(false);
        setCurrentPage(1);
        setSelectedMonth(null);
    };

    const handleChartClick = (data) => {
        const clickedMonth = (data?.activePayload?.[0]?.payload?.name) || data?.activeLabel;

        if (clickedMonth) {
            setSelectedMonth(prev => {
                if (prev === clickedMonth) {
                    return null; // Deselect
                } else {
                    return clickedMonth; // Select
                }
            });
            setCurrentPage(1); // Reset pagination
            setActiveNoteIndex(null); // Close notes
        }
    };

    // Custom Dot Component for visual feedback
    const CustomDot = (props) => {
        const { cx, cy, payload } = props;
        const isSelected = payload.name === selectedMonth;

        if (isSelected) {
            return (
                <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#8884d8"
                    stroke="white"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                />
            );
        }
        return (
            <circle
                cx={cx}
                cy={cy}
                r={3}
                fill="white"
                stroke="#8884d8"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
            />
        );
    };

    // Determine Title
    let chartTitle = "Total (Filtros Actuales)";
    if (selectedItem) {
        chartTitle = selectedItem;
    } else if (searchTerm && isContextualSearch) {
        chartTitle = `Resultados para "${searchTerm}"`;
    }

    // Reusable Type Checkboxes Component
    const renderTypeFilter = (compact = false) => (
        <div className={`flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 select-none">
                <Filter size={compact ? 12 : 13} className="text-slate-400" />
                Tipo:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
                {MOVEMENT_TYPES.map(type => {
                    const isChecked = selectedTypes.has(type.id);
                    return (
                        <label
                            key={type.id}
                            className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border select-none ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} ${
                                isChecked
                                    ? 'bg-white border-slate-300 shadow-xs text-slate-800'
                                    : 'bg-slate-100/60 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleType(type.id)}
                                className={`rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
                            />
                            <span className={`rounded-full ${type.dot} ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${!isChecked ? 'opacity-30' : ''}`} />
                            <span>{type.label}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <Card className="overflow-visible">
                <CardHeader>
                    <CardTitle>Explorador</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Toggle Search Type & Movement Type Filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => toggleSearchType('concept')}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${searchType === 'concept'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <FileText size={16} />
                                <span>Por Concepto</span>
                            </button>
                            <button
                                onClick={() => toggleSearchType('category')}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${searchType === 'category'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <Tag size={16} />
                                <span>Por Categoría</span>
                            </button>
                        </div>

                        {renderTypeFilter(false)}
                    </div>

                    <div className="relative">
                        <div className="flex items-center border rounded-md px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:ring-2 ring-blue-500">
                            <Search className="text-slate-400 mr-2" size={20} />
                            {searchType === 'category' ? (
                                <select
                                    className="w-full bg-transparent outline-none cursor-pointer"
                                    value={selectedItem || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                            handleSelectItem(val);
                                        } else {
                                            setSelectedItem(null);
                                            setSearchTerm('');
                                            setCurrentPage(1);
                                            setSelectedMonth(null);
                                        }
                                    }}
                                >
                                    <option value="">Seleccionar categoría...</option>
                                    {uniqueItems.map((item, idx) => (
                                        <option key={idx} value={item}>{item}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Buscar concepto (ej: Mercadona)..."
                                    className="w-full bg-transparent outline-none"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setSelectedItem(null);
                                        setIsContextualSearch(false); // Reset contextual on type
                                        setCurrentPage(1);
                                        setSelectedMonth(null);
                                    }}
                                    onKeyDown={handleKeyDown}
                                />
                            )}
                        </div>
                        {/* Autocomplete Dropdown (Components only) */}
                        {(searchType === 'concept' && !selectedItem && !isContextualSearch && searchTerm) && (
                            <div className="absolute z-20 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                                {uniqueItems.length > 0 ? (
                                    uniqueItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                            onClick={() => handleSelectItem(item)}
                                        >
                                            {item}
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-2 text-sm text-slate-400">No se encontraron resultados</div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="h-[400px]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Tendencia: {chartTitle}</CardTitle>
                    {selectedMonth && (
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm animate-in fade-in slide-in-from-right-5">
                            <span className="font-medium">Filtrado por: {selectedMonth}</span>
                            <button
                                onClick={() => setSelectedMonth(null)}
                                className="hover:bg-blue-100 rounded-full p-0.5"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ bottom: 20 }}
                            onClick={handleChartClick}
                            className="cursor-pointer"
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={60}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis tickFormatter={(val) => `${val} €`} width={80} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#8884d8"
                                name="Importe Neto"
                                dot={<CustomDot />}
                                activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2, fill: 'white' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <CardTitle>Historial de Transacciones ({tableTransactions.length})</CardTitle>
                        {renderTypeFilter(true)}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-slate-500">
                            Página {currentPage} de {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Concepto</th>
                                    <th className="px-4 py-3">Entidad</th>
                                    <th className="px-4 py-3">Categoría</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3 text-right">Importe</th>
                                    <th className="px-4 py-3 text-center">Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400 text-sm">
                                            No se encontraron transacciones con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    currentTransactions.map((t, idx) => (
                                        <tr key={idx} className="border-b hover:bg-slate-50">
                                            <td className="px-4 py-3">{t.parsedDate.toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{t.Concepto}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{t.Entidad}</td>
                                            <td className="px-4 py-3 text-slate-500">{t['Categoría']}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                                    t['Tipo de movimiento'] === 'Gasto'
                                                        ? 'bg-red-50 text-red-700'
                                                        : t['Tipo de movimiento'] === 'Ingreso'
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {t['Tipo de movimiento'] || '—'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${t.parsedImporte > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(t.parsedImporte)}
                                            </td>
                                            <td className="px-4 py-3 text-center relative">
                                                {t.Nota && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveNoteIndex(activeNoteIndex === idx ? null : idx);
                                                            }}
                                                            className="text-amber-500 hover:text-amber-600 focus:outline-none transition-transform hover:scale-110"
                                                            title="Ver nota"
                                                        >
                                                            <StickyNote size={18} />
                                                        </button>
                                                        {activeNoteIndex === idx && (
                                                            <div className="absolute right-10 top-2 w-64 p-3 bg-amber-50 border border-amber-200 rounded-lg shadow-xl z-50 text-left">
                                                                <div className="flex items-center justify-between mb-2 border-b border-amber-200 pb-2">
                                                                    <div className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                                                                        <StickyNote size={12} /> Nota
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveNoteIndex(null);
                                                                        }}
                                                                        className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full p-0.5 transition-colors"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.Nota}</p>
                                                                <div className="absolute -right-2 top-4 w-4 h-4 bg-amber-50 border-t border-r border-amber-200 transform rotate-45"></div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ConceptExplorer;
