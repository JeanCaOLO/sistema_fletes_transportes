import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import CommentsSection from './CommentsSection';

interface Driver {
  name: string;
  id_card: string;
  vehicle_plate: string;
}

interface TicketDetailModalProps {
  ticket: {
    id: string;
    ticket_number?: number;
    expedition_id: string;
    description: string;
    origin: string;
    destination: string;
    status: string;
    amount?: number;
    created_at: string;
    completion_date?: string;
    photo_url?: string;
    assigned_carrier?: string;
    operation_datetime?: string;
    transport_type?: string;
    driver_id_card?: string;
    vehicle_plate?: string;
    drivers?: Driver[];
    shipment_numbers?: string[];
    price_approved?: boolean;
  };
  onClose: () => void;
  onUpdate: () => void;
  type: 'travel' | 'warehouse';
}

const statusOptions = [
  'nuevo',
  'pendiente_asignar',
  'asignado',
  'exito',
  'cancelado',
  'fallido',
];

const statusLabels: Record<string, string> = {
  nuevo: 'Nuevo',
  pendiente_asignar: 'Pendiente de Asignar',
  asignado: 'Asignado',
  exito: 'Éxito',
  cancelado: 'Cancelado',
  fallido: 'Fallido',
};

const transportTypes = [
  'Moto',
  'Plataforma',
  'Camión pequeño',
  'Camión mediano',
  'Furgón 28"',
  'Furgón 48"',
  'Furgón 53"',
];

export default function TicketDetailModal({ ticket, onClose, onUpdate, type }: TicketDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  const initialDrivers: Driver[] = ticket.drivers && ticket.drivers.length > 0
    ? ticket.drivers
    : [{ name: '', id_card: ticket.driver_id_card || '', vehicle_plate: ticket.vehicle_plate || '' }];

  const [formData, setFormData] = useState({
    expedition_id: ticket.expedition_id,
    description: ticket.description,
    origin: ticket.origin,
    destination: ticket.destination,
    status: ticket.status,
    amount: ticket.amount || 0,
    completion_date: ticket.completion_date || '',
    assigned_carrier: ticket.assigned_carrier || '',
    operation_datetime: ticket.operation_datetime || '',
    transport_type: ticket.transport_type || '',
    driver_id_card: ticket.driver_id_card || '',
    vehicle_plate: ticket.vehicle_plate || '',
    shipment_numbers: ticket.shipment_numbers || [],
    price_approved: ticket.price_approved ?? false,
  });

  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(ticket.photo_url || null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatTicketNumber = (num?: number) => {
    if (!num) return '#0000';
    return `#${num.toString().padStart(4, '0')}`;
  };

  const addDriver = () => setDrivers([...drivers, { name: '', id_card: '', vehicle_plate: '' }]);

  const updateDriver = (index: number, field: keyof Driver, value: string) => {
    const updated = [...drivers];
    updated[index] = { ...updated[index], [field]: value };
    setDrivers(updated);
  };

  const removeDriver = (index: number) => {
    if (drivers.length === 1) return;
    setDrivers(drivers.filter((_, i) => i !== index));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let photoUrl = ticket.photo_url;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${ticket.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-photos')
          .upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('ticket-photos').getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      const tableName = type === 'travel' ? 'travel_tickets' : 'warehouse_tickets';

      const basePayload: Record<string, any> = {
        expedition_id: formData.expedition_id,
        description: formData.description,
        origin: formData.origin,
        destination: formData.destination,
        status: formData.status,
        amount: formData.amount,
        completion_date: formData.completion_date || null,
        assigned_carrier: formData.assigned_carrier || null,
        operation_datetime: formData.operation_datetime || null,
        transport_type: formData.transport_type || null,
        photo_url: photoUrl,
      };

      if (type === 'warehouse') {
        const validDrivers = drivers.filter(d => d.name || d.id_card || d.vehicle_plate);
        basePayload.drivers = validDrivers.length > 0 ? validDrivers : null;
        basePayload.price_approved = formData.price_approved;
        basePayload.shipment_numbers = formData.shipment_numbers.filter(s => s.trim() !== '');
        if ('dua' in formData) basePayload.dua = (formData as any).dua || null;
        if ('marchamo' in formData) basePayload.marchamo = (formData as any).marchamo || null;
        if ('caucion' in formData) basePayload.caucion = (formData as any).caucion || null;
      } else {
        basePayload.driver_id_card = formData.driver_id_card || null;
        basePayload.vehicle_plate = formData.vehicle_plate || null;
      }

      const { error } = await supabase.from(tableName).update(basePayload).eq('id', ticket.id);
      if (error) throw new Error(`Error updating ticket: ${JSON.stringify(error)}`);

      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Error al actualizar el ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ticket?')) return;
    setIsDeleting(true);
    try {
      const tableName = type === 'travel' ? 'travel_tickets' : 'warehouse_tickets';
      const { error } = await supabase.from(tableName).delete().eq('id', ticket.id);
      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error al eliminar el ticket');
    } finally {
      setIsDeleting(false);
    }
  };

  const addShipmentNumber = () => setFormData({ ...formData, shipment_numbers: [...formData.shipment_numbers, ''] });
  const updateShipmentNumber = (index: number, value: string) => {
    const newShipments = [...formData.shipment_numbers];
    newShipments[index] = value;
    setFormData({ ...formData, shipment_numbers: newShipments });
  };
  const removeShipmentNumber = (index: number) => {
    setFormData({ ...formData, shipment_numbers: formData.shipment_numbers.filter((_, i) => i !== index) });
  };

  const displayDrivers: Driver[] = ticket.drivers && ticket.drivers.length > 0
    ? ticket.drivers
    : (ticket.driver_id_card || ticket.vehicle_plate)
      ? [{ name: '', id_card: ticket.driver_id_card || '', vehicle_plate: ticket.vehicle_plate || '' }]
      : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{formatTicketNumber(ticket.ticket_number)}</h2>
              <span className="text-gray-400">•</span>
              <span className="text-lg font-semibold text-gray-700">{ticket.expedition_id}</span>
            </div>
            <p className="text-sm text-gray-500">{type === 'travel' ? 'Viaje Normal' : 'Viaje de Almacén'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Expedición</label>
                  <p className="text-gray-900">{ticket.expedition_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <p className="text-gray-900 capitalize">{statusLabels[ticket.status] || ticket.status}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <p className="text-gray-900">{ticket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
                  <p className="text-gray-900">{ticket.origin}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <p className="text-gray-900">{ticket.destination}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Creación</label>
                  <p className="text-gray-900">{new Date(ticket.created_at).toLocaleDateString('es-CR')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Finalización</label>
                  <p className="text-gray-900">{ticket.completion_date ? new Date(ticket.completion_date).toLocaleDateString('es-CR') : 'No especificada'}</p>
                </div>
              </div>

              {ticket.operation_datetime && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora de Operación</label>
                  <p className="text-gray-900">{new Date(ticket.operation_datetime).toLocaleString('es-CR')}</p>
                </div>
              )}

              {ticket.assigned_carrier && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transportista Asignado</label>
                  <p className="text-gray-900">{ticket.assigned_carrier}</p>
                </div>
              )}

              {type === 'warehouse' && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${ticket.price_approved ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-400'}`}>
                    {ticket.price_approved && <i className="ri-check-line text-white text-xs w-4 h-4 flex items-center justify-center"></i>}
                  </div>
                  <span className={`text-sm font-medium ${ticket.price_approved ? 'text-teal-700' : 'text-gray-500'}`}>
                    Precio aprobado por el transportista: <strong>{ticket.price_approved ? 'Sí' : 'No'}</strong>
                  </span>
                </div>
              )}

              {ticket.transport_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Transporte</label>
                  <p className="text-gray-900">{ticket.transport_type}</p>
                </div>
              )}

              {type === 'warehouse' && displayDrivers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choferes ({displayDrivers.length})
                  </label>
                  <div className="space-y-2">
                    {displayDrivers.map((driver, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Chofer {index + 1}</p>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          {driver.name && (
                            <div>
                              <span className="text-gray-500 text-xs">Nombre</span>
                              <p className="text-gray-900 font-medium">{driver.name}</p>
                            </div>
                          )}
                          {driver.id_card && (
                            <div>
                              <span className="text-gray-500 text-xs">Cédula</span>
                              <p className="text-gray-900 font-medium">{driver.id_card}</p>
                            </div>
                          )}
                          {driver.vehicle_plate && (
                            <div>
                              <span className="text-gray-500 text-xs">Placa</span>
                              <p className="text-gray-900 font-medium">{driver.vehicle_plate}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {type === 'travel' && (ticket.driver_id_card || ticket.vehicle_plate) && (
                <div className="grid grid-cols-2 gap-4">
                  {ticket.driver_id_card && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cédula del Chofer</label>
                      <p className="text-gray-900">{ticket.driver_id_card}</p>
                    </div>
                  )}
                  {ticket.vehicle_plate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Placa del Vehículo</label>
                      <p className="text-gray-900">{ticket.vehicle_plate}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Asignado</label>
                <p className="text-gray-900 text-lg font-semibold text-green-600">
                  ${(ticket.amount || 0).toLocaleString('es-CR')}
                </p>
              </div>

              {type === 'warehouse' && ticket.shipment_numbers && ticket.shipment_numbers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Números de Embarque</label>
                  <div className="flex flex-wrap gap-2">
                    {ticket.shipment_numbers.map((num, index) => (
                      <span key={index} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">{num}</span>
                    ))}
                  </div>
                </div>
              )}

              {ticket.photo_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fotografía de Respaldo</label>
                  <img src={ticket.photo_url} alt="Respaldo" className="max-w-md rounded-lg border border-gray-200" />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer">
                  <i className="ri-edit-line mr-2"></i>Editar
                </button>
                <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer">
                  <i className="ri-delete-bin-line mr-2"></i>{isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Expedición *</label>
                  <input type="text" value={formData.expedition_id} onChange={(e) => setFormData({ ...formData, expedition_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" required>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{statusLabels[status] || status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origen *</label>
                  <input type="text" value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                  <input type="text" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Finalización</label>
                  <input type="date" value={formData.completion_date} onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora de Operación</label>
                  <input type="datetime-local" value={formData.operation_datetime} onChange={(e) => setFormData({ ...formData, operation_datetime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportista Asignado</label>
                <input type="text" value={formData.assigned_carrier} onChange={(e) => setFormData({ ...formData, assigned_carrier: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Transporte</label>
                <select value={formData.transport_type} onChange={(e) => setFormData({ ...formData, transport_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
                  <option value="">Seleccionar tipo</option>
                  {transportTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {type === 'warehouse' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Choferes</label>
                    <button type="button" onClick={addDriver} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer whitespace-nowrap">
                      <i className="ri-add-circle-line w-4 h-4 flex items-center justify-center"></i>
                      Agregar chofer
                    </button>
                  </div>
                  <div className="space-y-3">
                    {drivers.map((driver, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chofer {index + 1}</span>
                          {drivers.length > 1 && (
                            <button type="button" onClick={() => removeDriver(index)} className="text-red-400 hover:text-red-600 cursor-pointer w-5 h-5 flex items-center justify-center">
                              <i className="ri-close-circle-line text-base"></i>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                            <input type="text" value={driver.name} onChange={(e) => updateDriver(index, 'name', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" placeholder="Nombre del chofer" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Cédula</label>
                            <input type="text" value={driver.id_card} onChange={(e) => updateDriver(index, 'id_card', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" placeholder="Número de cédula" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Placa</label>
                            <input type="text" value={driver.vehicle_plate} onChange={(e) => updateDriver(index, 'vehicle_plate', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" placeholder="Placa del vehículo" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cédula del Chofer</label>
                    <input type="text" value={formData.driver_id_card} onChange={(e) => setFormData({ ...formData, driver_id_card: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placa del Vehículo</label>
                    <input type="text" value={formData.vehicle_plate} onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
                  </div>
                </div>
              )}

              {type === 'warehouse' && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <input type="checkbox" id="edit_price_approved" checked={formData.price_approved} onChange={(e) => setFormData({ ...formData, price_approved: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600" />
                  <label htmlFor="edit_price_approved" className="text-sm font-medium text-amber-800 cursor-pointer select-none">
                    ✓ Precio aprobado por el transportista
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Asignado</label>
                <input type="number" step="0.01" min="0" max="99999999.99" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
                <p className="text-xs text-gray-500 mt-1">Máximo: 99,999,999.99</p>
              </div>

              {type === 'warehouse' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Números de Embarque</label>
                  <div className="space-y-2">
                    {formData.shipment_numbers.map((num, index) => (
                      <div key={index} className="flex gap-2">
                        <input type="text" value={num} onChange={(e) => updateShipmentNumber(index, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" placeholder={`Embarque ${index + 1}`} />
                        <button type="button" onClick={() => removeShipmentNumber(index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addShipmentNumber} className="px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors text-sm whitespace-nowrap cursor-pointer">
                      <i className="ri-add-line mr-1"></i>Agregar Embarque
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fotografía de Respaldo</label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
                {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 max-w-xs rounded-lg border border-gray-200" />}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer">
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button onClick={() => setIsEditing(false)} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <CommentsSection ticketId={ticket.id} ticketType={type} />
          </div>
        </div>
      </div>
    </div>
  );
}
