// modules/dataExporter.js
export class DataExporter {
    constructor() {
        this.isInitialized = false;
        this.formats = ['csv', 'json', 'xlsx'];
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Add any module-specific initialization here
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    exportData(data, format = 'csv', filename = 'export') {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.exportToCSV(data, filename);
            case 'json':
                return this.exportToJSON(data, filename);
            case 'xlsx':
                return this.exportToExcel(data, filename);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            return { success: false, error: 'No data to export' };
        }

        try {
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(item => 
                Object.values(item).map(value => 
                    typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                ).join(',')
            ).join('\n');

            const csvContent = `${headers}\n${rows}`;
            return {
                success: true,
                filename: `${filename}_${new Date().toISOString().split('T')[0]}.csv`,
                content: csvContent,
                type: 'text/csv'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    exportToJSON(data, filename) {
        try {
            return {
                success: true,
                filename: `${filename}_${new Date().toISOString().split('T')[0]}.json`,
                content: JSON.stringify(data, null, 2),
                type: 'application/json'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    exportToExcel(data, filename) {
        // Simplified Excel export (would use library like xlsx in production)
        try {
            const csv = this.exportToCSV(data, filename);
            return {
                ...csv,
                filename: `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    getSupportedFormats() {
        return this.formats;
    }
}