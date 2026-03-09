import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

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
  });
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar el monto
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
      driver_id_card: formData.driver_id_card || null,
      vehicle_plate: formData.vehicle_plate || null,
    };

    if (type === 'warehouse' && formData.shipment_numbers) {
      ticketData.shipment_numbers = formData.shipment_numbers
        .split(',')
        .map((num) => num.trim())
        .filter((num) => num);
    }

    if (type === 'warehouse') {
      ticketData.dua = formData.dua || null;
      ticketData.marchamo = formData.marchamo || null;
      ticketData.caucion = formData.caucion || null;
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
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