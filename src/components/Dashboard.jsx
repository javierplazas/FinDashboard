import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { formatCurrency } from '../utils/csvParser';
import { calculateYTD, calculateAnnualVariation, calculateMonthlyAverage, calculateWaterfallData } from '../utils/analytics';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const Dashboard = ({ data }) => {
    // Analytics Data
    const { ytdData, years } = useMemo(() => calculateYTD(data), [data]);
    const variationData = useMemo(() => calculateAnnualVariation(data), [data]);
    const averageData = useMemo(() => calculateMonthlyAverage(data), [data]);
    const waterfallData = useMemo(() => calculateWaterfallData(data), [data]);

    const totalImporte = useMemo(() => data.reduce((acc, curr) => acc + curr.parsedImporte, 0), [data]);

    // Transform YTD data to absolute values for visualization
    const absYtdData = useMemo(() => {
        return ytdData.map(item => {
            const newItem = { ...item };
            years.forEach(year => {
                if (newItem[year] !== undefined) {
                    newItem[year] = Math.abs(newItem[year]);
                }
            });
            return newItem;
        });
    }, [ytdData, years]);

    // Transform Average data to absolute values
    const absAverageData = useMemo(() => {
        return averageData.map(d => ({ ...d, average: Math.abs(d.average) }));
    }, [averageData]);

    const formatAxis = (val) => {
        const abs = Math.abs(val);
        if (abs >= 1000) return `${(abs / 1000).toFixed(1)}k €`;
        return `${abs.toFixed(0)} €`;
    };

    return (
        <div className="space-y-4">
            {/* Top KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-1 bg-white border-l-4 border-blue-500">
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500 font-medium uppercase">Importe Total</p>
                        <p className={`text-3xl font-bold mt-2 ${totalImporte >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                            {formatCurrency(totalImporte)}
                        </p>
                    </CardContent>
                </Card>

                {/* Monthly Average Chart (Small) */}
                <Card className="md:col-span-3">
                    <CardHeader className="py-2">
                        <CardTitle className="text-sm">Promedio Mensual por Año (Valor Absoluto)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[120px] pt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={absAverageData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                                <YAxis hide domain={[0, 'auto']} />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="average" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Chart: YTD Total per Month and Year */}
                <Card className="lg:col-span-2 h-[450px]">
                    <CardHeader>
                        <CardTitle>Total YTD por Mes y Año (Acumulado - Absoluto)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={absYtdData} margin={{ bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={formatAxis} width={80} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                                {years.map((year, index) => (
                                    <Line
                                        key={year}
                                        type="monotone"
                                        dataKey={year}
                                        stroke={COLORS[index % COLORS.length]}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Annual Variation Table */}
                <Card className="lg:col-span-1 h-[450px] overflow-hidden flex flex-col">
                    <CardHeader>
                        <CardTitle>Variación Anual</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Año</th>
                                    <th className="px-4 py-3 text-right">Importe</th>
                                    <th className="px-4 py-3 text-right">Dif. Año</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {variationData.map((row) => {
                                    const isExpense = row.amount < 0;
                                    const isIncrease = row.diff > 0;

                                    let colorClass = 'text-slate-600';
                                    let ArrowIcon = null;

                                    if (row.previous !== null) {
                                        if (isExpense) {
                                            colorClass = isIncrease ? 'text-red-600' : 'text-green-600';
                                            ArrowIcon = isIncrease ? ArrowUp : ArrowDown;
                                        } else {
                                            colorClass = isIncrease ? 'text-green-600' : 'text-red-600';
                                            ArrowIcon = isIncrease ? ArrowUp : ArrowDown;
                                        }
                                    }

                                    return (
                                        <tr key={row.year} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-700">{row.year}</td>
                                            <td className={`px-4 py-3 text-right font-medium ${row.amount >= 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                                                {formatCurrency(row.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {row.previous !== null ? (
                                                        <>
                                                            <span className={`text-xs ${colorClass}`}>
                                                                {row.percent.toFixed(1)}%
                                                            </span>
                                                            {ArrowIcon && <ArrowIcon size={12} className={colorClass} />}
                                                        </>
                                                    ) : (
                                                        <Minus size={12} className="text-slate-300" />
                                                    )}
                                                </div>
                                                {row.previous !== null && (
                                                    <div className="text-xs text-slate-400">
                                                        {isExpense && isIncrease ? '+' : ''}{formatCurrency(row.diff)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            {/* Waterfall Chart */}
            <Card className="h-[400px]">
                <CardHeader>
                    <CardTitle>Evolución Anual (Waterfall)</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={waterfallData} margin={{ bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis tickFormatter={formatAxis} width={80} tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-2 border shadow-sm rounded">
                                                <p className="font-bold">{data.name}</p>
                                                <p>Valor: {formatCurrency(data.amount)}</p>
                                                {data.type === 'step' && (
                                                    <p className="text-xs text-slate-500">
                                                        Inicio: {formatCurrency(data.start)} <br />
                                                        Fin: {formatCurrency(data.end)}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine y={0} stroke="#000" />
                            <Bar dataKey="end" fill="transparent" stackId="a" />
                            <Bar dataKey="amount" stackId="a">
                                {waterfallData.map((entry, index) => {
                                    let color = '#8884d8'; // Default total color
                                    if (entry.type === 'step') {
                                        const isExpenseContext = entry.start < 0;
                                        if (isExpenseContext) {
                                            color = entry.amount < 0 ? '#ef4444' : '#10b981';
                                        } else {
                                            color = entry.amount >= 0 ? '#10b981' : '#ef4444';
                                        }
                                    } else {
                                        color = '#3b82f6'; // Totals are Blue
                                    }
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;
