import React, { useMemo, useState } from 'react';
import { Filter, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';

const Sidebar = ({ data, filters, setFilters, activeTab }) => {
    // State for expanded types in the accordion
    const [expandedTypes, setExpandedTypes] = useState(new Set());

    const types = useMemo(() => {
        const typs = new Set(data.map(d => d['Tipo de movimiento']).filter(Boolean));
        return [...typs].sort();
    }, [data]);

    const years = useMemo(() => {
        const yrs = new Set(data.map(d => d.year));
        return [...yrs].sort((a, b) => b - a);
    }, [data]);

    // Group categories by type
    const categoriesByType = useMemo(() => {
        const mapping = {};
        types.forEach(type => {
            const cats = new Set(
                data
                    .filter(d => d['Tipo de movimiento'] === type)
                    .map(d => d['Categoría'])
                    .filter(Boolean)
            );
            mapping[type] = [...cats].sort();
        });
        return mapping;
    }, [data, types]);

    const toggleFilter = (type, value) => {
        setFilters(prev => {
            const current = prev[type];
            const newSet = new Set(current);
            if (newSet.has(value)) {
                newSet.delete(value);
            } else {
                newSet.add(value);
            }
            return { ...prev, [type]: newSet };
        });
    };

    const toggleTypeAccordion = (type) => {
        setExpandedTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    };

    // Helper to check if all categories of a type are selected (for visual cue, optional)
    // Or if the type itself is selected.
    // In this model, selecting a Type filters by that Type. Selecting a Category filters by that Category.
    // They are ANDed in App.jsx (Type AND Category).
    // But usually in hierarchical, selecting Type implies selecting all its categories OR filtering by Type.
    // Current App.jsx logic: (Type A OR Type B) AND (Cat X OR Cat Y).
    // If I select Type A, I see all Type A. If I also select Cat X (which is in Type A), I see only Cat X of Type A.
    // This works fine.

    const isExplorer = activeTab === 'explorer';

    return (
        <div className="w-64 bg-white border-r border-slate-200 h-full overflow-y-auto p-4 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b pb-4">
                <Filter size={20} />
                <span>Filtros</span>
            </div>

            {/* Year Filter - Always Active */}
            <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">Año</h3>
                <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
                    {years.map(year => (
                        <label key={year} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                                type="checkbox"
                                checked={filters.years.has(year)}
                                onChange={() => toggleFilter('years', year)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">{year}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Hierarchical Type/Category Filter */}
            <div className={isExplorer ? "opacity-50 pointer-events-none grayscale" : ""}>
                <h3 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider flex justify-between items-center">
                    Tipo y Categoría
                    {isExplorer && <span className="text-xs text-amber-600 font-normal normal-case">(Desactivado en Explorador)</span>}
                </h3>
                <div className="space-y-2">
                    {types.map(type => {
                        const isExpanded = expandedTypes.has(type);
                        const isTypeSelected = filters.types.has(type);
                        const typeCategories = categoriesByType[type] || [];

                        // Check if any category of this type is selected
                        const selectedCatsCount = typeCategories.filter(c => filters.categories.has(c)).length;
                        const isPartial = selectedCatsCount > 0 && selectedCatsCount < typeCategories.length;

                        return (
                            <div key={type} className="border rounded-md border-slate-100 overflow-hidden">
                                {/* Type Header */}
                                <div className="flex items-center bg-slate-50 p-2 hover:bg-slate-100 transition-colors">
                                    <button
                                        onClick={() => toggleTypeAccordion(type)}
                                        className="p-1 text-slate-400 hover:text-slate-600"
                                    >
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    <div
                                        className="flex-1 flex items-center gap-2 cursor-pointer ml-1"
                                        onClick={() => toggleFilter('types', type)}
                                    >
                                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${isTypeSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {isTypeSelected && <CheckSquare size={12} className="text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 select-none">{type}</span>
                                    </div>
                                </div>

                                {/* Categories List (Accordion Body) */}
                                {isExpanded && (
                                    <div className="pl-9 pr-2 py-2 space-y-1 bg-white border-t border-slate-100">
                                        {typeCategories.map(cat => (
                                            <label key={cat} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.categories.has(cat)}
                                                    onChange={() => toggleFilter('categories', cat)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-600 truncate" title={cat}>{cat}</span>
                                            </label>
                                        ))}
                                        {typeCategories.length === 0 && (
                                            <p className="text-xs text-slate-400 italic">Sin categorías</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
