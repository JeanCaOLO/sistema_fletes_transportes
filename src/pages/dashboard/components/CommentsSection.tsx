
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Props {
  ticketId: string;
  ticketType: 'travel' | 'warehouse';
}

export default function CommentsSection({ ticketId, ticketType }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [ticketId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      // Determinar la columna correcta según el tipo de ticket
      const columnName = ticketType === 'travel' ? 'travel_ticket_id' : 'warehouse_ticket_id';
      
      // Obtener comentarios
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq(columnName, ticketId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Obtener IDs únicos de usuarios
      const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];

      // Obtener información de usuarios
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combinar datos
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesData?.find(p => p.id === comment.user_id)
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Determinar la columna correcta según el tipo de ticket
      const insertData: any = {
        user_id: user.id,
        content: newComment.trim(),
      };

      if (ticketType === 'travel') {
        insertData.travel_ticket_id = ticketId;
      } else {
        insertData.warehouse_ticket_id = ticketId;
      }

      const { error } = await supabase
        .from('comments')
        .insert(insertData);

      if (error) throw error;

      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error al agregar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comentarios ({comments.length})
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No hay comentarios aún. Sé el primero en comentar.
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {comment.profiles?.full_name?.charAt(0).toUpperCase() || 
                         comment.profiles?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {comment.profiles?.full_name || comment.profiles?.email || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : 'Agregar Comentario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
