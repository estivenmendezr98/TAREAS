import { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { PlusCircle } from 'lucide-react';
import { useToast } from './context/ToastContext';
import DatePicker from './components/DatePicker';

const TaskForm = ({ onTaskAdded, projectId }) => {
    const [descripcion, setDescripcion] = useState('');
    const [fechaObjetivo, setFechaObjetivo] = useState('');
    const [startDate, setStartDate] = useState('');
    const { addToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!descripcion) return;

        try {
            const newTask = {
                descripcion,
                fecha_objetivo: fechaObjetivo || null,
                start_date: startDate || null,
                project_id: projectId
            };
            await axios.post('http://localhost:3000/api/tasks', newTask);
            setDescripcion('');
            setFechaObjetivo('');
            setStartDate('');
            onTaskAdded();
            addToast('Tarea agregada exitosamente', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            addToast('Error al crear la tarea', 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="task-form">
            <div className="input-group">
                <input
                    type="text"
                    placeholder="Nueva tarea para este título..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="task-input"
                    required
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ minWidth: '160px' }}>
                        <DatePicker
                            selectedDate={startDate}
                            onChange={setStartDate}
                            placeholder="Inicio"
                        />
                    </div>
                    <div style={{ minWidth: '160px' }}>
                        <DatePicker
                            selectedDate={fechaObjetivo}
                            onChange={setFechaObjetivo}
                            placeholder="Fin (Límite)"
                        />
                    </div>
                </div>
            </div>
            <button type="submit" className="add-button">
                <PlusCircle size={20} />
            </button>
        </form>
    );
};

TaskForm.propTypes = {
    onTaskAdded: PropTypes.func.isRequired,
    projectId: PropTypes.number.isRequired,
};

export default TaskForm;
