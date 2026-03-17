import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface Driver {
  name: string;
  id_card: string;
  vehicle_plate: string;
}

interface Props {
  type: 'travel' | 'warehouse';
  onClose: () => void;
  onCreate: (ticketData: any) => void;
}

export default function CreateTicketModal({ type, onClose, onCreate }: Props) {
  const [formData, setFormData] = useState({
    expedition_id: '',
    description: '',
    origin: '',
    destination: '',
    completion_date: '',
    status: 'nuevo',
    amount: '',
    shipment_numbers: '',
    assigned_carrier: '',
    operation_datetime: '',
    transport_type: '',
    driver_id_card: '',
    vehicle_plate: '',
    dua: '',
    marchamo: '',
    caucion: '',
    price_approved: false,
  });

  const [drivers, setDrivers] = useState<Driver[]>([{ name: '', id_card: '', vehicle_plate: '' }]);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const addDriver = () => {
    setDrivers([...drivers, { name: '', id_card: '', vehicle_plate: '' }]);
  };

  const updateDriver = (index: number, field: keyof Driver, value: string) => {
    const updated = [...drivers];
    updated[index] = { ...updated[index], [field]: value };
    setDrivers(updated);
  };

  const removeDriver = (index: number) => {
    if (drivers.length === 1) return;
    setDrivers(drivers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount) {
      const amountValue = parseFloat(formData.amount);
      if (amountValue > 99999999.99) {
        alert('El monto no puede exceder 99,999,999.99');
        return;
      }
      if (amountValue < 0) {
        alert('El monto no puede ser negativo');
        return;
      }
    }

    let photoUrl = null;

    if (photoFile) {
      setUploading(true);
      try {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${type}-tickets/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-photos')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-photos')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Error al subir la foto');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const ticketData: any = {
      expedition_id: formData.expedition_id,
      description: formData.description,
      origin: formData.origin,
      destination: formData.destination,
      completion_date: formData.completion_date || null,
      status: formData.status,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      photo_url: photoUrl,
      assigned_carrier: formData.assigned_carrier || null,
      operation_datetime: formData.operation_datetime || null,
      transport_type: formData.transport_type || null,
    };

    if (type === 'warehouse') {
      // Múltiples choferes
      const validDrivers = drivers.filter(d => d.name || d.id_card || d.vehicle_plate);
      ticketData.drivers = validDrivers.length > 0 ? validDrivers : null;
      // Compatibilidad con campos legacy
      ticketData.driver_id_card = validDrivers[0]?.id_card || null;
      ticketData.vehicle_plate = validDrivers[0]?.vehicle_plate || null;

      ticketData.dua = formData.dua || null;
      ticketData.marchamo = formData.marchamo || null;
      ticketData.caucion = formData.caucion || null;
      ticketData.price_approved = formData.price_approved;

      if (formData.shipment_numbers) {
        ticketData.shipment_numbers = formData.shipment_numbers
          .split(',')
          .map((num) => num.trim())
          .filter((num) => num);
      }
    } else {
      ticketData.driver_id_card = formData.driver_id_card || null;
      ticketData.vehicle_plate = formData.vehicle_plate || null;
    }

    onCreate(ticketData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-lg w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900">
            Crear Ticket - {type === 'travel' ? 'Viaje Normal' : 'Viaje de Almacén'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <i className="ri-close-line text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              ID Expedición / Número de Tarea *
            </label>
            <input
              type="text"
              required
              value={formData.expedition_id}
              onChange={(e) => setFormData({ ...formData, expedition_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="Ej: EXP-001"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="Describe el ticket..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Lugar de Origen *
              </label>
              <input
                type="text"
                required
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="Ciudad, País"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Lugar de Destino *
              </label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="Ciudad, País"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Tipo Transporte
            </label>
            <select
              value={formData.transport_type}
              onChange={(e) => setFormData({ ...formData, transport_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">Seleccionar tipo de transporte</option>
              <option value="Moto">Moto</option>
              <option value="Plataforma">Plataforma</option>
              <option value="Camión pequeño">Camión pequeño</option>
              <option value="Camión mediano">Camión mediano</option>
              <option value="Furgón 28&quot;">Furgón 28"</option>
              <option value="Furgón 48&quot;">Furgón 48"</option>
              <option value="Furgón 53&quot;">Furgón 53"</option>
            </select>
          </div>

          {type === 'warehouse' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                DUA
              </label>
              <input
                type="text"
                value={formData.dua}
                onChange={(e) => setFormData({ ...formData, dua: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="Número de DUA"
              />
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Transportista Asignado
            </label>
            <input
              type="text"
              value={formData.assigned_carrier}
              onChange={(e) => setFormData({ ...formData, assigned_carrier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="Nombre del transportista"
            />
          </div>

          {/* Choferes: múltiples para almacén, uno para viaje normal */}
          {type === 'warehouse' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  Choferes
                </label>
                <button
                  type="button"
                  onClick={addDriver}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-circle-line w-4 h-4 flex items-center justify-center"></i>
                  Agregar chofer
                </button>
              </div>
              <div className="space-y-3">
                {drivers.map((driver, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Chofer {index + 1}
                      </span>
                      {drivers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDriver(index)}
                          className="text-red-400 hover:text-red-600 cursor-pointer w-5 h-5 flex items-center justify-center"
                        >
                          <i className="ri-close-circle-line text-base"></i>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                        <input
                          type="text"
                          value={driver.name}
                          onChange={(e) => updateDriver(index, 'name', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                          placeholder="Nombre del chofer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cédula</label>
                        <input
                          type="text"
                          value={driver.id_card}
                          onChange={(e) => updateDriver(index, 'id_card', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                          placeholder="Número de cédula"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Placa</label>
                        <input
                          type="text"
                          value={driver.vehicle_plate}
                          onChange={(e) => updateDriver(index, 'vehicle_plate', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                          placeholder="Placa del vehículo"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Cédula del Chofer
                </label>
                <input
                  type="text"
                  value={formData.driver_id_card}
                  onChange={(e) => setFormData({ ...formData, driver_id_card: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Número de cédula"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Placa del Vehículo
                </label>
                <input
                  type="text"
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Número de placa"
                />
              </div>
            </div>
          )}

          {type === 'warehouse' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Marchamo
                </label>
                <input
                  type="text"
                  value={formData.marchamo}
                  onChange={(e) => setFormData({ ...formData, marchamo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Número de marchamo"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Caución
                </label>
                <input
                  type="text"
                  value={formData.caucion}
                  onChange={(e) => setFormData({ ...formData, caucion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Número de caución"
                />
              </div>
            </div>
          )}

          {type === 'warehouse' && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <input
                type="checkbox"
                id="price_approved"
                checked={formData.price_approved}
                onChange={(e) => setFormData({ ...formData, price_approved: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
              />
              <label htmlFor="price_approved" className="text-xs sm:text-sm font-medium text-amber-800 cursor-pointer select-none">
                ✓ Precio aprobado por el transportista
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Fecha y Hora de Operación
            </label>
            <input
              type="datetime-local"
              value={formData.operation_datetime}
              onChange={(e) => setFormData({ ...formData, operation_datetime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Fecha de Finalización
            </label>
            <input
              type="date"
              value={formData.completion_date}
              onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="nuevo">Nuevo</option>
              <option value="pendiente_asignar">Pendiente de Asignar</option>
              <option value="asignado">Asignado</option>
              <option value="exito">Éxito</option>
              <option value="cancelado">Cancelado</option>
              <option value="fallido">Fallido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Monto Asignado
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="99999999.99"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Máximo: 99,999,999.99</p>
          </div>

          {type === 'warehouse' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Números de Embarque
              </label>
              <input
                type="text"
                value={formData.shipment_numbers}
                onChange={(e) => setFormData({ ...formData, shipment_numbers: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="Separados por comas: EMB-001, EMB-002"
              />
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Fotografía de Respaldo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 sticky bottom-0 bg-white pb-2 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm whitespace-nowrap cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2.5 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Subiendo...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
