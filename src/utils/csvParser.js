import Papa from 'papaparse';

export const parseCSV = (fileContent) => {
    return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const cleanedData = results.data.map((row) => {
                    // Parse Importe: "-15,90" -> -15.90
                    let importe = 0;
                    if (row.Importe) {
                        importe = parseFloat(row.Importe.replace('.', '').replace(',', '.'));
                    }

                    // Parse Date: "31/12/25" -> Date object
                    // Assuming DD/MM/YY
                    let date = null;
                    if (row['Fecha valor']) {
                        const parts = row['Fecha valor'].split('/');
                        if (parts.length === 3) {
                            // Add 2000 to year if it's 2 digits
                            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                            date = new Date(`${year}-${parts[1]}-${parts[0]}`);
                        }
                    }

                    return {
                        ...row,
                        'Tipo de movimiento': row['Tipo de movimiento'] ? row['Tipo de movimiento'].trim() : '',
                        'Categoría': row['Categoría'] ? row['Categoría'].trim() : '',
                        'Concepto': row['Concepto'] ? row['Concepto'].trim() : '',
                        'Nota': row['Nota'] ? row['Nota'].trim() : '',
                        parsedDate: date,
                        parsedImporte: importe,
                        year: date ? date.getFullYear() : null,
                        month: date ? date.getMonth() : null, // 0-11
                    };
                }).filter(row => row.parsedDate && !isNaN(row.parsedImporte));

                resolve(cleanedData);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
};

export const parseXLSX = (arrayBuffer) => {
    return new Promise((resolve, reject) => {
        try {
            import('xlsx').then((XLSX) => {
                const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                const cleanedData = jsonData.map((row) => {
                    // Map Excel columns to our internal format if necessary
                    // Assuming headers match or are close.
                    // Excel dates come as Date objects if cellDates: true is used.

                    let date = row['Fecha valor'] || row['Fecha de operación'];
                    if (!(date instanceof Date) && typeof date === 'string') {
                        // Fallback for string dates in Excel
                        const parts = date.split('/');
                        if (parts.length === 3) {
                            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                            date = new Date(`${year}-${parts[1]}-${parts[0]}`);
                        }
                    }

                    // Importe might be a number already
                    let importe = row['Importe'];
                    if (typeof importe === 'string') {
                        importe = parseFloat(importe.replace('.', '').replace(',', '.'));
                    }

                    return {
                        ...row,
                        'Tipo de movimiento': row['Tipo de movimiento'] ? row['Tipo de movimiento'].trim() : '',
                        'Categoría': row['Categoría'] ? row['Categoría'].trim() : '',
                        'Concepto': row['Concepto'] ? row['Concepto'].trim() : '',
                        'Nota': row['Nota'] ? row['Nota'].trim() : '',
                        parsedDate: date,
                        parsedImporte: importe || 0,
                        year: date ? date.getFullYear() : null,
                        month: date ? date.getMonth() : null,
                    };
                }).filter(row => row.parsedDate && !isNaN(row.parsedImporte));

                resolve(cleanedData);
            }).catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};
