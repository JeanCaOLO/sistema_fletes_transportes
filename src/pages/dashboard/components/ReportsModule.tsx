import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface ReportData {
  totalTickets: number;
  statusBreakdown: {
    nuevo: number;
    pendiente_asignar: number;
    asignado: number;
    exito: number;
    cancelado: number;
    fallido: number;
  };
  totalAmount: number;
  averageAmount: number;
  transportBreakdown: {
    [key: string]: number;
  };
}

const TRANSPORT_TYPES = [
  'Moto',
  'Plataforma',
  'Camión pequeño',
  'Camión mediano',
  'Furgón 28"',
  'Furgón 48"',
  'Furgón 53"'
];

const STATUS_LABELS: { [key: string]: string } = {
  nuevo: 'Nuevos',
  pendiente_asignar: 'Pendiente de Asignar',
  asignado: 'Asignado',
  exito: 'Éxito',
  cancelado: 'Cancelado',
  fallido: 'Fallido'
};

export default function ReportsModule() {
  const [filter, setFilter] = useState<'all' | 'travel' | 'warehouse'>('all');
  const [travelData, setTravelData] = useState<ReportData | null>(null);
  const [warehouseData, setWarehouseData] = useState<ReportData | null>(null);
  const [travelTickets, setTravelTickets] = useState<any[]>([]);
  const [warehouseTickets, setWarehouseTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchReportData();
  }, [dateFrom, dateTo]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Build query for travel tickets
      let travelQuery = supabase.from('travel_tickets').select('*');
      
      if (dateFrom) {
        travelQuery = travelQuery.gte('created_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        travelQuery = travelQuery.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data: travelTicketsData, error: travelError } = await travelQuery;
      if (travelError) throw travelError;

      // Build query for warehouse tickets
      let warehouseQuery = supabase.from('warehouse_tickets').select('*');
      
      if (dateFrom) {
        warehouseQuery = warehouseQuery.gte('created_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        warehouseQuery = warehouseQuery.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data: warehouseTicketsData, error: warehouseError } = await warehouseQuery;
      if (warehouseError) throw warehouseError;

      // Store raw tickets for Excel export
      setTravelTickets(travelTicketsData || []);
      setWarehouseTickets(warehouseTicketsData || []);

      // Process travel data
      setTravelData(processTicketData(travelTicketsData || []));

      // Process warehouse data
      setWarehouseData(processTicketData(warehouseTicketsData || []));
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTicketData = (tickets: any[]): ReportData => {
    const statusBreakdown = {
      nuevo: 0,
      pendiente_asignar: 0,
      asignado: 0,
      exito: 0,
      cancelado: 0,
      fallido: 0
    };

    const transportBreakdown: { [key: string]: number } = {};
    TRANSPORT_TYPES.forEach(type => {
      transportBreakdown[type] = 0;
    });

    let totalAmount = 0;
    let ticketsWithAmount = 0;

    tickets.forEach(ticket => {
      // Count by status
      if (ticket.status in statusBreakdown) {
        statusBreakdown[ticket.status as keyof typeof statusBreakdown]++;
      }

      // Count by transport type
      if (ticket.transport_type && ticket.transport_type in transportBreakdown) {
        transportBreakdown[ticket.transport_type]++;
      }

      // Calculate amounts
      if (ticket.amount !== null && ticket.amount !== undefined) {
        totalAmount += Number(ticket.amount);
        ticketsWithAmount++;
      }
    });

    return {
      totalTickets: tickets.length,
      statusBreakdown,
      totalAmount,
      averageAmount: ticketsWithAmount > 0 ? totalAmount / ticketsWithAmount : 0,
      transportBreakdown
    };
  };

  const getCombinedData = (): ReportData => {
    if (!travelData || !warehouseData) {
      return {
        totalTickets: 0,
        statusBreakdown: {
          nuevo: 0,
          pendiente_asignar: 0,
          asignado: 0,
          exito: 0,
          cancelado: 0,
          fallido: 0
        },
        totalAmount: 0,
        averageAmount: 0,
        transportBreakdown: {}
      };
    }

    const combined: ReportData = {
      totalTickets: travelData.totalTickets + warehouseData.totalTickets,
      statusBreakdown: {
        nuevo: travelData.statusBreakdown.nuevo + warehouseData.statusBreakdown.nuevo,
        pendiente_asignar: travelData.statusBreakdown.pendiente_asignar + warehouseData.statusBreakdown.pendiente_asignar,
        asignado: travelData.statusBreakdown.asignado + warehouseData.statusBreakdown.asignado,
        exito: travelData.statusBreakdown.exito + warehouseData.statusBreakdown.exito,
        cancelado: travelData.statusBreakdown.cancelado + warehouseData.statusBreakdown.cancelado,
        fallido: travelData.statusBreakdown.fallido + warehouseData.statusBreakdown.fallido
      },
      totalAmount: travelData.totalAmount + warehouseData.totalAmount,
      averageAmount: 0,
      transportBreakdown: {}
    };

    // Calculate combined average
    const totalTicketsWithAmount = 
      (travelData.averageAmount > 0 ? travelData.totalTickets : 0) +
      (warehouseData.averageAmount > 0 ? warehouseData.totalTickets : 0);
    
    combined.averageAmount = totalTicketsWithAmount > 0 
      ? combined.totalAmount / totalTicketsWithAmount 
      : 0;

    // Combine transport breakdown
    TRANSPORT_TYPES.forEach(type => {
      combined.transportBreakdown[type] = 
        (travelData.transportBreakdown[type] || 0) + 
        (warehouseData.transportBreakdown[type] || 0);
    });

    return combined;
  };

  const getDisplayData = (): ReportData => {
    if (filter === 'travel') return travelData!;
    if (filter === 'warehouse') return warehouseData!;
    return getCombinedData();
  };

  const exportToExcel = () => {
    const buildCSV = (rows: Record<string, string | number>[]): string => {
      if (rows.length === 0) return '';
      const headers = Object.keys(rows[0]);
      const escape = (val: string | number) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const lines = [
        headers.map(escape).join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(','))
      ];
      return lines.join('\r\n');
    };

    const downloadCSV = (csv: string, sheetName: string) => {
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      let filename = `${sheetName}`;
      if (dateFrom || dateTo) {
        if (dateFrom) filename += `_desde_${dateFrom}`;
        if (dateTo) filename += `_hasta_${dateTo}`;
      }
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    if (filter === 'all' || filter === 'travel') {
      const travelExportData = travelTickets.map(ticket => ({
        'ID': ticket.ticket_number || ticket.id,
        'ID Expedición': ticket.expedition_id || '',
        'Descripción': ticket.description || '',
        'Origen': ticket.origin || '',
        'Destino': ticket.destination || '',
        'Estado': STATUS_LABELS[ticket.status] || ticket.status || '',
        'Tipo Transporte': ticket.transport_type || '',
        'Transportista': ticket.assigned_carrier || '',
        'Cédula Chofer': ticket.driver_id_card || '',
        'Placa Vehículo': ticket.vehicle_plate || '',
        'Monto': ticket.amount ?? 0,
        'Fecha Creación': ticket.created_at ? new Date(ticket.created_at).toLocaleString('es-CR') : '',
        'Fecha Finalización': ticket.completion_date ? new Date(ticket.completion_date).toLocaleString('es-CR') : '',
        'Fecha/Hora Operación': ticket.operation_datetime ? new Date(ticket.operation_datetime).toLocaleString('es-CR') : ''
      }));
      if (travelExportData.length > 0) {
        downloadCSV(buildCSV(travelExportData), 'Viajes_Normales');
      }
    }

    if (filter === 'all' || filter === 'warehouse') {
      const warehouseExportData = warehouseTickets.map(ticket => ({
        'ID': ticket.ticket_number || ticket.id,
        'ID Expedición': ticket.expedition_id || '',
        'Descripción': ticket.description || '',
        'Origen': ticket.origin || '',
        'Destino': ticket.destination || '',
        'Estado': STATUS_LABELS[ticket.status] || ticket.status || '',
        'Tipo Transporte': ticket.transport_type || '',
        'Transportista': ticket.assigned_carrier || '',
        'Cédula Chofer': ticket.driver_id_card || '',
        'Placa Vehículo': ticket.vehicle_plate || '',
        'DUA': ticket.dua || '',
        'Marchamo': ticket.marchamo || '',
        'Caución': ticket.caucion || '',
        'Números de Embarque': Array.isArray(ticket.shipment_numbers) ? ticket.shipment_numbers.join(', ') : '',
        'Monto': ticket.amount ?? 0,
        'Fecha Creación': ticket.created_at ? new Date(ticket.created_at).toLocaleString('es-CR') : '',
        'Fecha Finalización': ticket.completion_date ? new Date(ticket.completion_date).toLocaleString('es-CR') : '',
        'Fecha/Hora Operación': ticket.operation_datetime ? new Date(ticket.operation_datetime).toLocaleString('es-CR') : ''
      }));
      if (warehouseExportData.length > 0) {
        downloadCSV(buildCSV(warehouseExportData), 'Viajes_Almacen');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando reportes...</div>
      </div>
    );
  }

  const displayData = getDisplayData();
  const maxStatusCount = Math.max(...Object.values(displayData.statusBreakdown));
  const maxTransportCount = Math.max(...Object.values(displayData.transportBreakdown));

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Reportes y Métricas</h2>
        
        <button
          onClick={exportToExcel}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm whitespace-nowrap cursor-pointer"
        >
          <i className="ri-file-excel-2-line text-lg w-5 h-5 flex items-center justify-center"></i>
          Descargar Excel
        </button>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Desde:
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Hasta:
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full sm:w-auto px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-close-line mr-1"></i>
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg mb-4 sm:mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filter === 'all'
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('travel')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filter === 'travel'
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Viajes Normales
        </button>
        <button
          onClick={() => setFilter('warehouse')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filter === 'warehouse'
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Viajes de Almacén
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total de Tickets</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{displayData.totalTickets}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-list-3-line text-xl sm:text-2xl text-teal-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Monto Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                ${displayData.totalAmount.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-xl sm:text-2xl text-green-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Monto Promedio</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                ${displayData.averageAmount.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-bar-chart-box-line text-xl sm:text-2xl text-blue-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Tickets por Estado</h3>
        <div className="space-y-3 sm:space-y-4">
          {Object.entries(displayData.statusBreakdown).map(([status, count]) => {
            const percentage = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className="bg-teal-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transport Type Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Distribución por Tipo de Transporte</h3>
        <div className="space-y-3 sm:space-y-4">
          {TRANSPORT_TYPES.map((type) => {
            const count = displayData.transportBreakdown[type] || 0;
            const percentage = maxTransportCount > 0 ? (count / maxTransportCount) * 100 : 0;
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{type}</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}