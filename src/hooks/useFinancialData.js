import { useState, useEffect } from 'react';
import { parseCSV } from '../utils/csvParser';

export const useFinancialData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch CSV files and XLSX with cache busting
                const timestamp = new Date().getTime();
                const [responseCurrent, responseHistory, response2017] = await Promise.all([
                    fetch(`/movimientos.csv?t=${timestamp}`),
                    fetch(`/movimientos - hasta 1 mayo 2022.csv?t=${timestamp}`),
                    fetch(`/Movimientos 2017.xlsx?t=${timestamp}`)
                ]);

                if (!responseCurrent.ok) throw new Error('Failed to fetch current data');
                if (!responseHistory.ok) throw new Error('Failed to fetch historical data');
                // response2017 might fail if file missing, handle gracefully? 
                // User said it exists.

                // Current data is likely UTF-8
                const textCurrent = await responseCurrent.text();
                const textHistory = await responseHistory.text();

                let parsed2017 = [];
                if (response2017.ok) {
                    const buffer2017 = await response2017.arrayBuffer();
                    const { parseXLSX } = await import('../utils/csvParser');
                    parsed2017 = await parseXLSX(buffer2017);
                }

                const parsedCurrent = await parseCSV(textCurrent);
                const parsedHistory = await parseCSV(textHistory);

                // Define Cut-off Date: May 2, 2022
                const CUTOFF_DATE = new Date('2022-05-02');
                CUTOFF_DATE.setHours(0, 0, 0, 0);

                // Filter Current: >= May 2, 2022
                const filteredCurrent = parsedCurrent.filter(d => d.parsedDate >= CUTOFF_DATE);

                // Filter History: < May 2, 2022
                const filteredHistory = parsedHistory.filter(d => d.parsedDate < CUTOFF_DATE);

                // Filter 2017: Ensure it's before cut-off (redundant but safe)
                const filtered2017 = parsed2017.filter(d => d.parsedDate < CUTOFF_DATE);

                console.log(`Loaded ${parsedCurrent.length} current rows, filtered to ${filteredCurrent.length}`);
                console.log(`Loaded ${parsedHistory.length} historical rows, filtered to ${filteredHistory.length}`);
                console.log(`Loaded ${parsed2017.length} 2017 rows, filtered to ${filtered2017.length}`);

                // Merge data
                const allData = [...filteredCurrent, ...filteredHistory, ...filtered2017];

                // Sort by date descending
                allData.sort((a, b) => b.parsedDate - a.parsedDate);

                setData(allData);
                setLoading(false);
            } catch (err) {
                console.error("Error loading data:", err);
                setError(err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};
