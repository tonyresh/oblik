import { useEffect } from 'react';
import { useData } from '../store/DataContext';
import { format } from 'date-fns';

export function useAutoReport() {
  const { visitors, dirtySkyEvents } = useData();

  useEffect(() => {
    const generateAndSendReport = async () => {
      if (visitors.length === 0 && (!dirtySkyEvents || dirtySkyEvents.length === 0)) return;

      console.log('Generating hourly auto-report...');

      const headers = [
        'Дата', 'Звання', 'ПІБ', 'Позивний', 'Група', 'Час входу', 'Час виходу', 'Тривалість (хв)'
      ];

      const rows: string[][] = [];
      visitors.forEach(v => {
        const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
        logs.forEach(log => {
          if (!log.in) return;
          const logDate = new Date(log.in);
          
          rows.push([
            format(logDate, 'dd.MM.yyyy'),
            v.category,
            v.name,
            v.callsign || '',
            v.group || '',
            format(logDate, 'HH:mm'),
            log.out ? format(new Date(log.out), 'HH:mm') : '',
            v.totalTimeMinutes ? v.totalTimeMinutes.toString() : '0'
          ]);
        });
      });

      // Add Dirty Sky events to auto-report
      (dirtySkyEvents || []).forEach(e => {
        const logDate = new Date(e.startTime);
        rows.push([
          format(logDate, 'dd.MM.yyyy'),
          '—',
          'Брудне небо',
          '—',
          'Спец. події',
          format(logDate, 'HH:mm'),
          e.endTime ? format(new Date(e.endTime), 'HH:mm') : 'триває',
          '0'
        ]);
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const now = new Date();
      const fileName = `Відвідувачі_${format(now, 'yyyy-MM-dd_HH-mm')}.csv`;

      try {
        const response = await fetch('/api/save-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvData: csvContent, fileName })
        });
        
        if (response.ok) {
          console.log('Auto-report saved successfully');
        } else {
          console.error('Failed to save auto-report');
        }
      } catch (error) {
        console.error('Error sending auto-report:', error);
      }
    };

    // Run every hour (3600000 ms)
    const interval = setInterval(generateAndSendReport, 3600000);
    
    // Also run once on mount (after a short delay to ensure data is loaded)
    const timeout = setTimeout(generateAndSendReport, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [visitors]);
}
