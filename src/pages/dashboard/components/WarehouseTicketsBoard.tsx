import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import TicketCard from './TicketCard';
import CreateTicketModal from './CreateTicketModal';
import TicketDetailModal from './TicketDetailModal';

interface Ticket {
  id: number;
  expedition_id: string;
  description: string;
  origin: string;
  destination: string;
  completion_date: string | null;
  status: string;
  amount: number | null;
  photo_url: string | null;
  created_at: string;
  shipment_numbers: string[] | null;
  assigned_carrier: string | null;
  operation_datetime: string | null;
  transport_type: string | null;
  driver_id_card: string | null;
  vehicle_plate: string | null;
  dua: string | null;
  marchamo: string | null;
  caucion: string | null;
}

const COLUMNS = [
  { id: 'nuevo', title: 'Nuevo', color: 'bg-blue-50 border-blue-200' },
  { id: 'pendiente_asignar', title: 'Pendiente de Asignar', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'asignado', title: 'Asignado', color: 'bg-purple-50 border-purple-200' },
  { id: 'exito', title: 'Éxito', color: 'bg-green-50 border-green-200' },
  { id: 'cancelado', title: 'Cancelado', color: 'bg-gray-50 border-gray-200' },
  { id: 'fallido', title: 'Fallido', color: 'bg-red-50 border-red-200' },
];

export default function WarehouseTicketsBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColumn, setSelectedColumn] = useState<string>('nuevo');
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    fetchTickets();
    
    const subscription = supabase
      .channel('warehouse_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      window.removeEventListener('resize', checkMobile);
      subscription.unsubscribe();
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      const { error } = await supabase
        .from('warehouse_tickets')
        .insert([ticketData]);

      if (error) throw error;
      setShowCreateModal(false);
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error al crear el ticket');
    }
  };

  const handleUpdateTicket = async (ticketId: number, updates: any) => {
    try {
      const { error } = await supabase
        .from('warehouse_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Error al actualizar el ticket');
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ticket?')) return;

    try {
      const { error } = await supabase
        .from('warehouse_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error al eliminar el ticket');
    }
  };

  const getTicketsByColumn = (columnId: string) => {
    const filtered = tickets.filter(ticket => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        String(ticket.id).includes(q) ||
        (ticket.expedition_id || '').toLowerCase().includes(q) ||
        (ticket.assigned_carrier || '').toLowerCase().includes(q)
      );
    });
    return filtered.filter(ticket => ticket.status === columnId);
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(ticket.id).includes(q) ||
      (ticket.expedition_id || '').toLowerCase().includes(q) ||
      (ticket.assigned_carrier || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando tickets...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <i className="ri-search-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por ID, expedición o transportista..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
          </button>
        )}
      </div>

      {/* Mobile Column Selector */}
      {isMobile && (
        <div className="mb-4">
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
          >
            {COLUMNS.map(column => (
              <option key={column.id} value={column.id}>
                {column.title} ({getTicketsByColumn(column.id).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Desktop View - Kanban Board */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {COLUMNS.map(column => (
            <div key={column.id} className="flex flex-col">
              <div className={`${column.color} border rounded-lg p-3 mb-3`}>
                <h3 className="font-semibold text-sm text-gray-900">{column.title}</h3>
                <span className="text-xs text-gray-600">
                  {getTicketsByColumn(column.id).length} tickets
                </span>
              </div>
              <div className="space-y-3 flex-1">
                {getTicketsByColumn(column.id).map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => setSelectedTicket(ticket)}
                  />
                ))}
                {getTicketsByColumn(column.id).length === 0 && searchQuery && (
                  <div className="text-center py-4 text-gray-400 text-xs">Sin resultados</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile View - List */}
      {isMobile && (
        <div className="space-y-3">
          {searchQuery
            ? filteredTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))
            : getTicketsByColumn(selectedColumn).map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))
          }
          {(searchQuery ? filteredTickets : getTicketsByColumn(selectedColumn)).length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchQuery ? 'No se encontraron resultados' : 'No hay tickets en esta columna'}
            </div>
          )}
        </div>
      )}

      {/* Create Button - Desktop */}
      {!isMobile && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 transition-colors flex items-center justify-center cursor-pointer"
        >
          <i className="ri-add-line text-2xl w-6 h-6 flex items-center justify-center"></i>
        </button>
      )}

      {/* Create Button - Mobile FAB */}
      {isMobile && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 transition-colors flex items-center justify-center cursor-pointer z-40"
        >
          <i className="ri-add-line text-2xl w-6 h-6 flex items-center justify-center"></i>
        </button>
      )}

      {showCreateModal && (
        <CreateTicketModal
          type="warehouse"
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTicket}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          type="warehouse"
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleUpdateTicket}
          onDelete={handleDeleteTicket}
        />
      )}
    </div>
  );
}