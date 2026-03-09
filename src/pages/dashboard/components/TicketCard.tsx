interface Props {
  ticket: any;
  onClick: () => void;
}

const STATUS_COLORS: { [key: string]: string } = {
  nuevo: 'bg-blue-100 text-blue-800',
  pendiente_asignar: 'bg-yellow-100 text-yellow-800',
  asignado: 'bg-purple-100 text-purple-800',
  exito: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-800',
  fallido: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: { [key: string]: string } = {
  nuevo: 'Nuevo',
  pendiente_asignar: 'Pendiente',
  asignado: 'Asignado',
  exito: 'Éxito',
  cancelado: 'Cancelado',
  fallido: 'Fallido',
};

export default function TicketCard({ ticket, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-gray-500 truncate flex-1">
          #{ticket.id}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
            STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {STATUS_LABELS[ticket.status] || ticket.status}
        </span>
      </div>

      <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 truncate">
        {ticket.expedition_id}
      </h4>

      <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">
        {ticket.description}
      </p>

      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
          <i className="ri-map-pin-line text-teal-600 w-4 h-4 flex items-center justify-center flex-shrink-0"></i>
          <span className="truncate">{ticket.origin}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
          <i className="ri-map-pin-fill text-teal-600 w-4 h-4 flex items-center justify-center flex-shrink-0"></i>
          <span className="truncate">{ticket.destination}</span>
        </div>
      </div>

      {ticket.amount && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Monto:</span>
            <span className="text-sm sm:text-base font-semibold text-gray-900">
              ${Number(ticket.amount).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {ticket.assigned_carrier && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
          <i className="ri-user-line w-3 h-3 flex items-center justify-center flex-shrink-0"></i>
          <span className="truncate">{ticket.assigned_carrier}</span>
        </div>
      )}
    </div>
  );
}