import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Plus } from 'lucide-react';
import ProjectItem from './ProjectItem';
import CalendarView from './CalendarView';
import RecycleBinView from './RecycleBinView';
import GanttChart from './components/Gantt/GanttChart';
import ConfirmationModal from './components/ConfirmationModal';
import UsersView from './components/UsersView';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import CategoryManager from './components/CategoryManager';
import { Tag, ChevronDown, ChevronRight } from 'lucide-react';
import './index.css';

function AppContent() {
  const { isAuthenticated, logout: authLogout, user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]); // New state for categories
  const [expandedCategories, setExpandedCategories] = useState({}); // Track expanded/collapsed state
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState(''); // New state for selected category
  const [showCategoryManager, setShowCategoryManager] = useState(false); // Modal state
  const [viewMode, setViewMode] = useState('active'); // 'active', 'archived', 'calendar', 'deleted', 'gantt'
  const [deletedData, setDeletedData] = useState({ projects: [], tasks: [] });
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, type: null, id: null });
  const [undoStack, setUndoStack] = useState([]); // Stack of actions to undo
  const { addToast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [token]);

  const fetchDeleted = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/deleted', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeletedData(response.data);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
    }
  }, [token]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
      // Initialize all categories as expanded by default
      const initialExpanded = {};
      response.data.forEach(c => initialExpanded[c.id] = true);
      // Also init "uncategorized" key
      initialExpanded['uncategorized'] = true;
      setExpandedCategories(prev => ({ ...initialExpanded, ...prev }));

    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchProjects();
      fetchCategories();
    }
  }, [fetchProjects, fetchCategories, isAuthenticated, token]);

  useEffect(() => {
    if (viewMode === 'deleted' && user) {
      fetchDeleted();
    }
  }, [viewMode, user, fetchDeleted]);

  // Flatten all tasks for Gantt View
  const allTasks = useMemo(() => {
    return projects.flatMap(p => p.tasks.map(t => ({ ...t, project_title: p.title }))).filter(t => !t.deleted_at);
  }, [projects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    try {
      await axios.post('http://localhost:3000/api/projects', {
        title: newProjectTitle,
        category_id: newProjectCategory || null
      }, {
        headers: { Authorization: `Bearer ${token}` } // Ensure headers are passed if not using global interceptor
      });
      setNewProjectTitle('');
      setNewProjectCategory('');
      setViewMode('active');
      fetchProjects();
      addToast('Proyecto creado exitosamente', 'success');
    } catch (error) {
      console.error('Error creating project:', error);
      addToast('Error al crear proyecto', 'error');
    }
  };

  const handleNavigateToProject = (projectId) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (targetProject) {
      setViewMode(targetProject.is_archived ? 'archived' : 'active');
      setTimeout(() => {
        const element = document.getElementById(`project-${projectId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add('highlight-pulse');
          setTimeout(() => element.classList.remove('highlight-pulse'), 2000);
        }
      }, 100);
    }
  };

  const handleRestore = async (type, id) => {
    try {
      await axios.post(`http://localhost:3000/api/restore/${type}/${id}`);
      fetchDeleted();
      fetchProjects();
      addToast('Elemento restaurado', 'success');
    } catch (error) {
      console.error(`Error restoring ${type}:`, error);
      addToast('Error al restaurar', 'error');
    }
  };

  const handlePermanentDelete = (type, id) => {
    setConfirmModalState({ isOpen: true, type, id });
  };

  const executePermanentDelete = async () => {
    const { type, id } = confirmModalState;
    if (!type || !id) return;

    try {
      await axios.delete(`http://localhost:3000/api/permanent/${type}/${id}`);
      fetchDeleted();
      addToast('Elemento eliminado permanentemente', 'success');
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      addToast('Error al eliminar', 'error');
    }
  };

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    const newStack = undoStack.slice(0, -1);
    setUndoStack(newStack);

    try {
      if (action.type === 'TASK_UPDATE') {
        const { taskId, previousValues } = action.payload;
        // Revert to previous values
        await axios.put(`http://localhost:3000/api/tasks/${taskId}`, {
          start_date: previousValues.start_date,
          fecha_objetivo: previousValues.fecha_objetivo,
          descripcion: previousValues.descripcion
        });
        fetchProjects();
        addToast('Acción deshecha', 'info');
      }
    } catch (error) {
      console.error('Error undoing action:', error);
      addToast('Error al deshacer', 'error');
    }
  }, [undoStack, fetchProjects, addToast]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  const handleGanttTaskUpdate = async (taskId, updates, previousValues) => {
    try {
      await axios.put(`http://localhost:3000/api/tasks/${taskId}`, updates);
      fetchProjects(); // Refresh to sync state
      addToast('Tarea actualizada', 'success');

      if (previousValues) {
        setUndoStack(prev => [...prev, {
          type: 'TASK_UPDATE',
          payload: { taskId, previousValues }
        }]);
      }
    } catch (error) {
      console.error('Error updating task from Gantt:', error);
      addToast('Error al actualizar tarea', 'error');
    }
  };

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const displayedProjects = projects.filter(p => {
    if (viewMode === 'archived') return p.is_archived;
    if (viewMode === 'active') return !p.is_archived;
    return false;
  });

  const handleLogout = () => {
    setProjects([]); // Clear projects on logout
    setDeletedData({ projects: [], tasks: [] }); // Clear deleted items
    authLogout();
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className={viewMode === 'gantt' ? "app-container-full" : "app-container"}>
      <header className="app-header">
        <h1>Mis Tareas y Proyectos</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>Hola, {user?.username}</span>
          <button onClick={handleLogout} style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer', background: '#e5e7eb', border: '1px solid #ccc', borderRadius: '4px' }}>Cerrar Sesión</button>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowCategoryManager(true)}
          className="action-btn"
          style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500 }}
        >
          <Tag size={16} style={{ marginRight: '5px' }} /> Administrar Etiquetas
        </button>
      </div>


      {
        viewMode === 'active' && (
          <section className="create-project-section">
            <form onSubmit={handleCreateProject} className="project-form">
              <input
                type="text"
                className="project-input"
                placeholder="Nuevo Título de Proyecto..."
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
              />

              <select
                value={newProjectCategory}
                onChange={(e) => setNewProjectCategory(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', color: '#6b7280', fontSize: '0.9rem', padding: '0 1rem', cursor: 'pointer', outline: 'none', maxWidth: '150px'
                }}
              >
                <option value="">Sin Etiqueta</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <button type="submit" className="project-button">
                <Plus size={20} /> Crear
              </button>
            </form>
          </section>
        )
      }

      <div className="view-toggle-container">
        <button
          className={`view-toggle-btn ${viewMode === 'active' ? 'active' : ''}`}
          onClick={() => setViewMode('active')}
        >
          Activos
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          Calendario
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'gantt' ? 'active' : ''}`}
          onClick={() => setViewMode('gantt')}
        >
          Diagrama Gantt
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'archived' ? 'active' : ''}`}
          onClick={() => setViewMode('archived')}
        >
          Archivados
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'deleted' ? 'active' : ''}`}
          onClick={() => setViewMode('deleted')}
          style={{
            backgroundColor: viewMode === 'deleted' ? '#fee2e2' : 'transparent',
            color: viewMode === 'deleted' ? '#ef4444' : '#6b7280'
          }}
        >
          Eliminados
        </button>
        {user?.role === 'admin' && (
          <button
            className={`view-toggle-btn ${viewMode === 'users' ? 'active' : ''}`}
            onClick={() => setViewMode('users')}
            style={{
              backgroundColor: viewMode === 'users' ? '#e0f2fe' : 'transparent',
              color: viewMode === 'users' ? '#0284c7' : '#6b7280'
            }}
          >
            Usuarios
          </button>
        )}
      </div>

      <div className="content-area" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'active' && (
          <div className="projects-list">
            {/* Group Projects by Category */}
            {(() => {
              // Grouping Logic
              const grouped = {};
              const uncategorized = [];

              displayedProjects.forEach(p => {
                if (p.category_id) {
                  if (!grouped[p.category_id]) grouped[p.category_id] = [];
                  grouped[p.category_id].push(p);
                } else {
                  uncategorized.push(p);
                }
              });

              return (
                <>
                  {/* Render Categorized Groups */}
                  {categories.map(cat => {
                    const catProjects = grouped[cat.id];
                    if (!catProjects || catProjects.length === 0) return null;

                    return (
                      <div key={cat.id} className="category-group" style={{ marginBottom: '2rem' }}>
                        <div
                          className="category-header"
                          onClick={() => toggleCategory(cat.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingLeft: '0.5rem',
                            cursor: 'pointer', userSelect: 'none'
                          }}
                        >
                          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                            {expandedCategories[cat.id] ? <ChevronDown size={20} color="#6b7280" /> : <ChevronRight size={20} color="#6b7280" />}
                          </button>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }}></span>
                          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#374151', margin: 0 }}>{cat.name}</h2>
                          <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>{catProjects.length}</span>
                        </div>

                        {expandedCategories[cat.id] && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingLeft: '1rem', borderLeft: `2px solid ${cat.color}20` }}>
                            {catProjects.map(project => (
                              <ProjectItem
                                key={project.id}
                                project={project}
                                categories={categories}
                                onUpdate={fetchProjects}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Render Uncategorized */}
                  {uncategorized.length > 0 && (
                    <div className="category-group">
                      {categories.length > 0 && ( // Only show header if there are other categories to distinguish from
                        <div
                          className="category-header"
                          onClick={() => toggleCategory('uncategorized')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingLeft: '0.5rem',
                            cursor: 'pointer', userSelect: 'none'
                          }}
                        >
                          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                            {expandedCategories['uncategorized'] ? <ChevronDown size={20} color="#6b7280" /> : <ChevronRight size={20} color="#6b7280" />}
                          </button>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e5e7eb' }}></span>
                          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>Sin Etiqueta</h2>
                          <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>{uncategorized.length}</span>
                        </div>
                      )}

                      {(categories.length === 0 || expandedCategories['uncategorized']) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingLeft: categories.length > 0 ? '1rem' : 0, borderLeft: categories.length > 0 ? '2px solid #e5e7eb' : 'none' }}>
                          {uncategorized.map(project => (
                            <ProjectItem
                              key={project.id}
                              project={project}
                              categories={categories}
                              onUpdate={fetchProjects}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {displayedProjects.length === 0 && (
                    <p className="no-projects">No hay proyectos activos.</p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {viewMode === 'calendar' && (
          <CalendarView projects={projects} onNavigateToProject={handleNavigateToProject} />
        )}

        {viewMode === 'gantt' && (
          <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
            <GanttChart tasks={allTasks} onTaskUpdate={handleGanttTaskUpdate} />
          </div>
        )}

        {viewMode === 'archived' && (
          <div className="projects-list">
            {displayedProjects.map(project => (
              <ProjectItem
                key={project.id}
                project={project}
                categories={categories}
                onUpdate={fetchProjects}
              />
            ))}
            {displayedProjects.length === 0 && (
              <p className="no-projects">No hay proyectos archivados.</p>
            )}
          </div>
        )}

        {viewMode === 'deleted' && (
          <RecycleBinView
            deletedProjects={deletedData.projects}
            deletedTasks={deletedData.tasks}
            onRestore={handleRestore}
            onDeletePermanent={handlePermanentDelete}
          />
        )}

        {viewMode === 'users' && user?.role === 'admin' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <UsersView />
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
        onConfirm={executePermanentDelete}
        title="¿Eliminar permanentemente?"
        message="¿Estás seguro de que quieres eliminar esto permanentemente? Esta acción NO se puede deshacer."
        confirmText="Eliminar"
        isDestructive={true}
      />

      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onUpdate={() => {
          fetchCategories();
          fetchProjects();
        }}
      />
    </div >
  );
}

// Wrapper to force remount when user changes
function AppWrapper() {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  // key={user?.id} forces a complete remount of AppContent when user changes
  return <AppContent key={user?.id || 'guest'} />;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppWrapper />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

