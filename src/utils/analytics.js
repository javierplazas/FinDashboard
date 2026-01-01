export const calculateYTD = (data) => {
    // Group by Year -> Month
    const yearlyData = {};

    data.forEach(d => {
        const year = d.year;
        const month = d.month; // 0-11
        const amount = d.parsedImporte;

        if (!yearlyData[year]) {
            yearlyData[year] = Array(12).fill(0);
        }
        yearlyData[year][month] += amount;
    });

    // Calculate Cumulative Sum (YTD)
    const ytdData = [];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // We want a structure like: { month: 'Jan', 2023: 100, 2024: 120, ... }
    for (let i = 0; i < 12; i++) {
        const row = { name: months[i], monthIndex: i };
        Object.keys(yearlyData).forEach(year => {
            // Sum from 0 to i
            let sum = 0;
            for (let j = 0; j <= i; j++) {
                sum += yearlyData[year][j];
            }
            row[year] = sum;
        });
        ytdData.push(row);
    }

    return { ytdData, years: Object.keys(yearlyData).sort() };
};

export const calculateAnnualVariation = (data) => {
    const yearlyTotals = {};
    data.forEach(d => {
        if (!yearlyTotals[d.year]) yearlyTotals[d.year] = 0;
        yearlyTotals[d.year] += d.parsedImporte;
    });

    const years = Object.keys(yearlyTotals).sort();
    const variationData = years.map((year, index) => {
        const current = yearlyTotals[year];
        const previous = index > 0 ? yearlyTotals[years[index - 1]] : null;

        let diff = 0;
        let percent = 0;

        if (previous !== null) {
            // If both are negative (expenses), calculate change in magnitude
            if (current < 0 && previous < 0) {
                // Spending increased if current is 'more negative' than previous
                // e.g. -600 vs -500 -> Diff should be +100 (spent 100 more)
                // Percent should be positive
                const absCurrent = Math.abs(current);
                const absPrevious = Math.abs(previous);
                diff = absCurrent - absPrevious;
                percent = previous !== 0 ? (diff / absPrevious) * 100 : 0;
            } else {
                // Standard calculation for income or mixed
                diff = current - previous;
                percent = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
            }
        }

        return {
            year,
            amount: current,
            previous: previous,
            diff: diff,
            percent: percent
        };
    });

    return variationData.sort((a, b) => b.year - a.year); // Newest first
};

export const calculateMonthlyAverage = (data) => {
    const monthlyTotals = {}; // "2023-0" -> 100

    data.forEach(d => {
        const key = `${d.year}-${d.month}`;
        if (!monthlyTotals[key]) monthlyTotals[key] = 0;
        monthlyTotals[key] += d.parsedImporte;
    });

    // Group by Year to get average per month
    const yearlyAverages = {};
    Object.entries(monthlyTotals).forEach(([key, value]) => {
        const [year] = key.split('-');
        if (!yearlyAverages[year]) yearlyAverages[year] = [];
        yearlyAverages[year].push(value);
    });

    return Object.entries(yearlyAverages).map(([year, values]) => ({
        year,
        average: values.reduce((a, b) => a + b, 0) / values.length
    })).sort((a, b) => a.year - b.year);
};

export const calculateWaterfallData = (data) => {
    // 1. Calculate totals per year
    const yearlyTotals = {};
    data.forEach(d => {
        if (!yearlyTotals[d.year]) yearlyTotals[d.year] = 0;
        yearlyTotals[d.year] += d.parsedImporte;
    });

    const years = Object.keys(yearlyTotals).sort();
    if (years.length === 0) return [];

    const waterfallData = [];

    // 2. Build waterfall steps
    // Step 1: Base (First Year)
    const firstYear = years[0];
    const firstAmount = yearlyTotals[firstYear];

    waterfallData.push({
        name: firstYear,
        amount: firstAmount,
        start: 0,
        end: firstAmount,
        type: 'total'
    });

    let currentLevel = firstAmount;

    for (let i = 1; i < years.length; i++) {
        const year = years[i];
        const amount = yearlyTotals[year];
        const diff = amount - yearlyTotals[years[i - 1]];

        // We want to show the CHANGE (diff) bridging the previous total to the new total?
        // OR simply the total of each year?
        // A standard financial waterfall usually shows:
        // [Year 1 Total] -> [Change Y1-Y2] -> [Change Y2-Y3] ... -> [Final Year Total]
        // But the user asked for "Diferencia anual (waterfall) escalonada".
        // If we just show bars for each year, that's a bar chart.
        // If we show the *difference* as a floating bar, that's a waterfall.

        // Let's do: Year N Total -> Difference -> Year N+1 Total
        // But that gets crowded.
        // Let's do: Year 1 (Total) -> Diff 1-2 -> Diff 2-3 -> ... -> Year N (Total)
        // This is a classic bridge.

        // However, if we just want to show the "Difference" chart but "stepped", maybe they mean:
        // Bar 1: Year 1 Diff
        // Bar 2: Year 2 Diff (starting from where Year 1 ended?)
        // No, that doesn't make sense for annual variations.

        // Let's stick to the "Bridge" concept which is the most common "Waterfall" in finance.
        // It explains how we got from Start Year to End Year.

        waterfallData.push({
            name: `${years[i - 1]}->${year}`,
            amount: diff,
            start: currentLevel,
            end: currentLevel + diff, // This doesn't sum up to the next year's total though.
            // Wait. Annual Variation is Year N - Year N-1.
            // Sum of variations != Total of Year N.
            // Sum of variations = (Y2-Y1) + (Y3-Y2) = Y3 - Y1.
            // So yes, a bridge of variations explains the change in ANNUAL TOTAL.

            type: 'step'
        });

        currentLevel += diff;
    }

    // Add final total? Or maybe intermediate totals?
    // Let's add the final year total to close the bridge.
    if (years.length > 1) {
        waterfallData.push({
            name: years[years.length - 1],
            amount: yearlyTotals[years[years.length - 1]],
            start: 0,
            end: yearlyTotals[years[years.length - 1]],
            type: 'total'
        });
    }

    return waterfallData;
};
