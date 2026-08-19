import React, { useState, useMemo } from 'react';
import { Patient, Appointment } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

export function ReportsView({ patients, appointments }: { patients: Patient[], appointments: Appointment[] }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      if (!startDate && !endDate) return true;
      const created = p.created_at ? new Date(p.created_at) : new Date(p.birth_date); // fallback
      let valid = true;
      if (startDate) {
        valid = valid && created >= new Date(startDate + 'T00:00:00');
      }
      if (endDate) {
        valid = valid && created <= new Date(endDate + 'T23:59:59');
      }
      return valid;
    });
  }, [patients, startDate, endDate]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (!startDate && !endDate) return true;
      const apptDate = new Date(a.date + 'T00:00:00');
      let valid = true;
      if (startDate) {
        valid = valid && apptDate >= new Date(startDate + 'T00:00:00');
      }
      if (endDate) {
        valid = valid && apptDate <= new Date(endDate + 'T23:59:59');
      }
      return valid;
    });
  }, [appointments, startDate, endDate]);

  const previousTherapyData = useMemo(() => {
    const counts = { sim: 0, nao: 0, ns: 0 };
    filteredPatients.forEach(p => {
      if (p.had_previous_therapy === true) counts.sim++;
      else if (p.had_previous_therapy === false) counts.nao++;
      else counts.ns++;
    });
    return [
      { name: 'Sim', value: counts.sim },
      { name: 'Não', value: counts.nao },
      { name: 'Não Informado', value: counts.ns },
    ].filter(d => d.value > 0);
  }, [filteredPatients]);

  const goalData = useMemo(() => {
    const goals: Record<string, number> = {};
    filteredPatients.forEach(p => {
      const goal = p.main_goal || 'Não informado';
      goals[goal] = (goals[goal] || 0) + 1;
    });
    return Object.keys(goals).map(key => ({ name: key, value: goals[key] })).sort((a,b) => b.value - a.value);
  }, [filteredPatients]);

  const availabilityData = useMemo(() => {
    const avail: Record<string, number> = {};
    filteredPatients.forEach(p => {
      const a = p.availability || 'Não informado';
      avail[a] = (avail[a] || 0) + 1;
    });
    return Object.keys(avail).map(key => ({ name: key, value: avail[key] }));
  }, [filteredPatients]);

  const attendanceData = useMemo(() => {
    let attended = 0;
    let missed = 0;
    let cancelled = 0;
    filteredAppointments.forEach(a => {
      if (a.status === 'ATTENDED') attended++;
      if (a.status === 'MISSED') missed++;
      if (a.status === 'CANCELLED') cancelled++;
    });
    return [
      { name: 'Realizadas', value: attended },
      { name: 'Faltas', value: missed },
      { name: 'Canceladas', value: cancelled }
    ].filter(d => d.value > 0);
  }, [filteredAppointments]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 flex flex-col md:flex-row md:items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Data Início</label>
          <input 
            type="date" 
            className="w-full md:w-48 px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Data Fim</label>
          <input 
            type="date" 
            className="w-full md:w-48 px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { setStartDate(''); setEndDate(''); }}
          className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors font-medium"
        >
          Limpar Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Acompanhamento Prévio */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          <h3 className="font-bold text-zinc-900 mb-6">Já realizou acompanhamento anteriormente?</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={previousTherapyData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {previousTherapyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disponibilidade */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          <h3 className="font-bold text-zinc-900 mb-6">Período de Disponibilidade</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={availabilityData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {availabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Motivo de Busca */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 lg:col-span-2">
          <h3 className="font-bold text-zinc-900 mb-6">Principal Objetivo / Motivo do Atendimento</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Presencialidade e Faltas */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 lg:col-span-2">
          <h3 className="font-bold text-zinc-900 mb-6">Presencialidade e Faltas (Consultas)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attendanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Realizadas' ? '#10b981' : 
                      entry.name === 'Faltas' ? '#f43f5e' : '#f59e0b'
                    } />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
