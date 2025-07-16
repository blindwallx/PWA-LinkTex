// src/components/OperariosManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { auth } from '../firebaseConfig';
import './OperariosManagement.css';
import ConfirmationModal from './ConfirmationModal'; // Importar el nuevo modal

interface Operario {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'operario' | 'admin';
}

interface OutletContextType {
  userRole: string | null;
  companyId: string | null;
}

const OperariosManagement: React.FC = () => {
  const { userRole, companyId } = useOutletContext<OutletContextType>();
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [companyAdminUsers, setCompanyAdminUsers] = useState<string[]>([]);

  // Estados para el modal de confirmación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  // Estado para detectar el tamaño de la pantalla
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const openConfirmationModal = (message: string, action: () => void) => {
    setModalMessage(message);
    setModalAction(() => action); // Usar un callback para setear la función
    setIsModalOpen(true);
  };

  const closeConfirmationModal = () => {
    setIsModalOpen(false);
    setModalMessage('');
    setModalAction(null);
  };

  const handleModalConfirm = () => {
    if (modalAction) {
      modalAction();
    }
    closeConfirmationModal();
  };


  const fetchOperarios = useCallback(async () => {
    if (userRole !== 'admin' || !companyId) {
      setError('Acceso denegado. Solo los administradores pueden gestionar operarios.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const usersQuery = query(collection(db, 'users'), where('companyId', '==', companyId));
      const usersSnapshot = await getDocs(usersQuery);
      const fetchedOperarios: Operario[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedOperarios.push({
          id: doc.id,
          firstName: data.firstName || 'N/A',
          lastName: data.lastName || 'N/A',
          email: data.email || 'N/A',
          phoneNumber: data.phoneNumber || 'N/A',
          status: data.status || 'pending',
          role: data.role as 'operario' | 'admin'
        });
      });
      setOperarios(fetchedOperarios);

      const companyDocRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyDocRef);
      if (companySnap.exists()) {
        const companyData = companySnap.data();
        setCompanyAdminUsers(companyData.adminUsers || []);
      } else {
        setCompanyAdminUsers([]);
      }

    } catch (err: unknown) {
      console.error('Error al cargar operarios:', err);
      if (err instanceof Error) {
        setError('Error al cargar operarios: ' + err.message);
      } else {
        setError('Error desconocido al cargar operarios.');
      }
    } finally {
      setLoading(false);
    }
  }, [userRole, companyId]);

  useEffect(() => {
    fetchOperarios();
  }, [fetchOperarios]);

  const handleApprove = async (operarioId: string) => {
    if (!companyId) {
      showFeedback('Error: ID de empresa no disponible.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const operarioDocRef = doc(db, 'users', operarioId);
      await updateDoc(operarioDocRef, { status: 'approved' });

      const companyDocRef = doc(db, 'companies', companyId);
      await updateDoc(companyDocRef, {
        operarioUsers: arrayUnion(operarioId)
      });

      showFeedback('Operario aprobado exitosamente.');
      await fetchOperarios();
    } catch (err: unknown) {
      console.error('Error al aprobar operario:', err);
      if (err instanceof Error) {
        setError('Error al aprobar operario: ' + err.message);
      } else {
        setError('Error desconocido al aprobar operario.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (operarioId: string) => {
    if (!companyId) {
      showFeedback('Error: ID de empresa no disponible.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const operarioDocRef = doc(db, 'users', operarioId);
      await updateDoc(operarioDocRef, { status: 'rejected' });

      const companyDocRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyDocRef);
      if (companySnap.exists() && companySnap.data().operarioUsers?.includes(operarioId)) {
        await updateDoc(companyDocRef, {
          operarioUsers: arrayRemove(operarioId)
        });
      }

      showFeedback('Operario rechazado.');
      await fetchOperarios();
    } catch (err: unknown) {
      console.error('Error al rechazar operario:', err);
      if (err instanceof Error) {
        setError('Error al rechazar operario: ' + err.message);
      } else {
        setError('Error desconocido al rechazar operario.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOperario = async (targetUserId: string, targetUserRole: string) => {
    let message = '';
    if (targetUserRole === 'admin') {
      if (auth.currentUser?.uid !== companyAdminUsers[0]) {
        showFeedback('Solo el creador de la empresa puede eliminar a otros administradores.');
        return;
      }
      if (targetUserId === auth.currentUser?.uid) {
        showFeedback('No puedes eliminar tu propia cuenta de administrador desde aquí.');
        return;
      }
      message = '¿Estás seguro de que quieres eliminar a este ADMINISTRADOR? Esta acción es irreversible.';
    } else {
      message = '¿Estás seguro de que quieres eliminar a este operario? Esta acción es irreversible.';
    }

    openConfirmationModal(message, async () => {
      if (!companyId) {
        showFeedback('Error: ID de empresa no disponible.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await deleteDoc(doc(db, 'users', targetUserId));

        const companyDocRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyDocRef);
        if (companySnap.exists()) {
          const companyData = companySnap.data();
          if (targetUserRole === 'operario' && companyData.operarioUsers?.includes(targetUserId)) {
            await updateDoc(companyDocRef, {
              operarioUsers: arrayRemove(targetUserId)
            });
          } else if (targetUserRole === 'admin' && companyData.adminUsers?.includes(targetUserId)) {
            await updateDoc(companyDocRef, {
              adminUsers: arrayRemove(targetUserId)
            });
          }
        }

        showFeedback('Usuario eliminado exitosamente.');
        await fetchOperarios();
      } catch (err: unknown) {
        console.error('Error al eliminar usuario:', err);
        if (err instanceof Error) {
          setError('Error al eliminar usuario: ' + err.message);
        } else {
          setError('Error desconocido al eliminar usuario.');
        }
      } finally {
        setLoading(false);
      }
    });
  };

  const handleChangeRoleToAdmin = async (operarioId: string) => {
    openConfirmationModal('¿Estás seguro de que quieres cambiar el rol de este operario a ADMINISTRADOR?', async () => {
      if (!companyId) {
        showFeedback('Error: ID de empresa no disponible.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const operarioDocRef = doc(db, 'users', operarioId);
        await updateDoc(operarioDocRef, { role: 'admin', status: 'approved' });

        const companyDocRef = doc(db, 'companies', companyId);
        await updateDoc(companyDocRef, {
          operarioUsers: arrayRemove(operarioId),
          adminUsers: arrayUnion(operarioId)
        });

        showFeedback('Rol cambiado a administrador exitosamente.');
        await fetchOperarios();
      } catch (err: unknown) {
        console.error('Error al cambiar rol a administrador:', err);
        if (err instanceof Error) {
          setError('Error al cambiar rol: ' + err.message);
        } else {
          setError('Error desconocido al cambiar rol.');
        }
      } finally {
        setLoading(false);
      }
    });
  };

  const handleChangeRoleToOperario = async (adminId: string) => {
    if (adminId === auth.currentUser?.uid) {
      showFeedback('No puedes cambiar tu propio rol.');
      return;
    }
    openConfirmationModal('¿Estás seguro de que quieres cambiar el rol de este administrador a OPERARIO?', async () => {
      if (!companyId) {
        showFeedback('Error: ID de empresa no disponible.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const adminDocRef = doc(db, 'users', adminId);
        await updateDoc(adminDocRef, { role: 'operario', status: 'approved' });

        const companyDocRef = doc(db, 'companies', companyId);
        await updateDoc(companyDocRef, {
          adminUsers: arrayRemove(adminId),
          operarioUsers: arrayUnion(adminId)
        });

        showFeedback('Rol cambiado a operario exitosamente.');
        await fetchOperarios();
      } catch (err: unknown) {
        console.error('Error al cambiar rol a operario:', err);
        if (err instanceof Error) {
          setError('Error desconocido al cambiar rol.');
        } else {
          setError('Error desconocido al cambiar rol.');
        }
      } finally {
        setLoading(false);
      }
    });
  };


  if (userRole !== 'admin') {
    return (
      <div className="operarios-management-container">
        <h2 className="operarios-management-title">Acceso Restringido</h2>
        <p className="operarios-management-description">Solo los administradores tienen acceso a esta sección.</p>
      </div>
    );
  }

  const pendingOperarios = operarios.filter(op => op.status === 'pending');
  const approvedOperarios = operarios.filter(op => op.status === 'approved' && op.role === 'operario');
  const rejectedOperarios = operarios.filter(op => op.status === 'rejected');
  const adminUsers = operarios.filter(op => op.role === 'admin');

  const companyCreatorId = companyAdminUsers.length > 0 ? companyAdminUsers[0] : null;
  const currentUserId = auth.currentUser?.uid;

  // Función auxiliar para renderizar la tabla o las tarjetas
  const renderUserList = (users: Operario[], sectionType: 'pending' | 'approved' | 'rejected' | 'admin') => {
    const renderTable = (usersToRender: Operario[]) => (
      <div className="table-responsive">
        <table className="operarios-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Teléfono</th>
              {sectionType === 'admin' ? <th>Rol</th> : <th>Estado</th>}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usersToRender.map(user => (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.email}</td>
                <td>{user.phoneNumber}</td>
                <td>
                  {sectionType === 'admin' ? (
                    <span className={`status-badge ${user.role}`}>{user.role}</span>
                  ) : (
                    <span className={`status-badge ${user.status}`}>{user.status}</span>
                  )}
                </td>
                <td className="actions-cell">
                  {sectionType === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(user.id)} className="approve-button">Aprobar</button>
                      <button onClick={() => handleReject(user.id)} className="reject-button">Rechazar</button>
                    </>
                  )}
                  {sectionType === 'approved' && user.role === 'operario' && (
                    <>
                      <button onClick={() => handleChangeRoleToAdmin(user.id)} className="change-role-button">Hacer Admin</button>
                      <button onClick={() => handleDeleteOperario(user.id, user.role)} className="delete-button">Eliminar</button>
                    </>
                  )}
                  {sectionType === 'rejected' && (
                    <button onClick={() => handleDeleteOperario(user.id, user.role)} className="delete-button">Eliminar</button>
                  )}
                  {sectionType === 'admin' && (
                    <>
                      {currentUserId === companyCreatorId ? (
                        // Si el admin logueado es el creador de la empresa
                        user.id !== currentUserId ? (
                          // Y esta fila no es la de él mismo
                          <>
                            <button
                              onClick={() => handleChangeRoleToOperario(user.id)}
                              className="change-role-button"
                            >
                              Hacer Operario
                            </button>
                            <button
                              onClick={() => handleDeleteOperario(user.id, user.role)}
                              className="delete-button"
                            >
                              Eliminar
                            </button>
                          </>
                        ) : (
                          // Esta fila ES la del admin creador (logueado)
                          <span className="self-actions-message">
                            (Creador de la empresa)
                          </span>
                        )
                      ) : (
                        // Si el admin logueado NO es el creador de la empresa (admin secundario)
                        // No se muestran acciones para NINGÚN administrador
                        <span></span> // O un mensaje si lo prefieres: "Acciones restringidas"
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    const renderCards = (usersToRender: Operario[]) => (
      <div className="operarios-cards-container">
        {usersToRender.map(user => (
          <div key={user.id} className="operario-card">
            <div className="card-item"><strong>Nombre:</strong> {user.firstName}</div>
            <div className="card-item"><strong>Apellido:</strong> {user.lastName}</div>
            <div className="card-item"><strong>Email:</strong> {user.email}</div>
            <div className="card-item"><strong>Teléfono:</strong> {user.phoneNumber}</div>
            <div className="card-item">
              <strong>{sectionType === 'admin' ? 'Rol:' : 'Estado:'}</strong>
              {sectionType === 'admin' ? (
                <span className={`status-badge ${user.role}`}>{user.role}</span>
              ) : (
                <span className={`status-badge ${user.status}`}>{user.status}</span>
              )}
            </div>
            <div className="card-actions">
              {sectionType === 'pending' && (
                <>
                  <button onClick={() => handleApprove(user.id)} className="approve-button">Aprobar</button>
                  <button onClick={() => handleReject(user.id)} className="reject-button">Rechazar</button>
                </>
              )}
              {sectionType === 'approved' && user.role === 'operario' && (
                <>
                  <button onClick={() => handleChangeRoleToAdmin(user.id)} className="change-role-button">Hacer Admin</button>
                  <button onClick={() => handleDeleteOperario(user.id, user.role)} className="delete-button">Eliminar</button>
                </>
              )}
              {sectionType === 'rejected' && (
                <button onClick={() => handleDeleteOperario(user.id, user.role)} className="delete-button">Eliminar</button>
              )}
              {sectionType === 'admin' && (
                <>
                  {currentUserId === companyCreatorId ? (
                    user.id !== currentUserId ? (
                      <>
                        <button
                          onClick={() => handleChangeRoleToOperario(user.id)}
                          className="change-role-button"
                        >
                          Hacer Operario
                        </button>
                        <button
                          onClick={() => handleDeleteOperario(user.id, user.role)}
                          className="delete-button"
                        >
                          Eliminar
                        </button>
                      </>
                    ) : (
                      <span className="self-actions-message">
                        (Creador de la empresa)
                      </span>
                    )
                  ) : (
                    <span></span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );

    return isMobile ? renderCards(users) : renderTable(users);
  };

  return (
    <div className="operarios-management-container">
      <h2 className="operarios-management-title">Gestión de Personal</h2>
      {feedbackMessage && <div className="feedback-message">{feedbackMessage}</div>}
      {error && <div className="error-message">{error}</div>}
      {loading && <p>Cargando operarios...</p>}

      {!loading && !error && (
        <div>

          <div className="operarios-section admin-section">
            <h3>Administradores ({adminUsers.length})</h3>
            {adminUsers.length === 0 ? (
              <p>No hay administradores en esta empresa (esto no debería ocurrir).</p>
            ) : (
              renderUserList(adminUsers, 'admin')
            )}
          </div>

          <div className="operarios-section pending-section">
            <h3>Pendientes por Ingreso ({pendingOperarios.length})</h3>
            {pendingOperarios.length === 0 ? (
              <p>No hay operarios pendientes de aprobación.</p>
            ) : (
              renderUserList(pendingOperarios, 'pending')
            )}
          </div>

          <div className="operarios-section approved-section">
            <h3>Operarios Activos ({approvedOperarios.length})</h3>
            {approvedOperarios.length === 0 ? (
              <p>No hay operarios activos en esta empresa.</p>
            ) : (
              renderUserList(approvedOperarios, 'approved')
            )}
          </div>

          

          <div className="operarios-section rejected-section">
            <h3>Operarios Rechazados ({rejectedOperarios.length})</h3>
            {rejectedOperarios.length === 0 ? (
              <p>No hay operarios rechazados.</p>
            ) : (
              renderUserList(rejectedOperarios, 'rejected')
            )}
          </div>
        
      
      <ConfirmationModal
        isOpen={isModalOpen}
        message={modalMessage}
        onConfirm={handleModalConfirm}
        onCancel={closeConfirmationModal}
      />
    </div>
      )
    }</div>  
  );
;
}
export default OperariosManagement;