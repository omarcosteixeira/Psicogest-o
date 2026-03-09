import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Settings, 
  LogOut, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  ChevronRight,
  UserCheck,
  ClipboardList,
  MessageCircle,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Patient, Appointment, UserRole, PatientStatus, ClinicSettings } from './types';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  onSnapshot,
  setDoc,
  getDoc
} from 'firebase/firestore';

const ROLES: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor/Supervisor',
  STUDENT_CLINIC: 'Atendente Clínica',
  STUDENT: 'Atendente'
};

const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  TRIAGEM: 'Em Triagem',
  AGUARDANDO_CONSULTA: 'Aguardando Consulta',
  PACIENTE_ATIVO: 'Paciente Ativo',
  FALTA: 'Falta',
  ALTA: 'Alta',
  DESISTENCIA: 'Desistência'
};

const STATUS_COLORS: Record<PatientStatus, string> = {
  TRIAGEM: 'bg-yellow-100 text-yellow-800',
  AGUARDANDO_CONSULTA: 'bg-blue-100 text-blue-800',
  PACIENTE_ATIVO: 'bg-green-100 text-green-800',
  FALTA: 'bg-red-100 text-red-800',
  ALTA: 'bg-purple-100 text-purple-800',
  DESISTENCIA: 'bg-gray-100 text-gray-800'
};

function calculateAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ registration: '', password: '' });
  const [error, setError] = useState('');

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [settings, setSettings] = useState<ClinicSettings>({
    workDays: [1, 2, 3, 4, 5],
    startTime: '08:00',
    endTime: '18:00',
    interval: 60
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'clinic_schedule');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as ClinicSettings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Fetch data
  useEffect(() => {
    if (!user) return;
    
    // Listen to patients
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Patient));
      setPatients(pData);
    });

    // Listen to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
      setUsers(uData);
    });

    // Listen to appointments
    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const aData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Appointment));
      setAppointments(aData);
    });

    return () => {
      unsubPatients();
      unsubUsers();
      unsubAppointments();
    };
  }, [user]);

  // Initialize Admin User in Firestore if not exists
  useEffect(() => {
    const initAdmin = async () => {
      const q = query(collection(db, 'users'), where('registration', '==', 'admin@estacio.br'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        await addDoc(collection(db, 'users'), {
          name: 'Administrador Sistema',
          registration: 'admin@estacio.br',
          password: '91931324',
          role: 'ADMIN'
        });
      }
    };
    initAdmin();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const q = query(
        collection(db, 'users'), 
        where('registration', '==', loginData.registration),
        where('password', '==', loginData.password)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as User;
        if (userData.blocked) {
          setError('Acesso bloqueado. Contate o administrador.');
        } else {
          setUser(userData);
        }
      } else {
        setError('Login ou senha incorretos');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar ao Firebase');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-8"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
              <ClipboardList className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">PsicoGestão</h1>
            <p className="text-zinc-500 text-sm">Clínica Escola de Psicologia</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Matrícula ou Email</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Digite sua matrícula ou email"
                value={loginData.registration}
                onChange={e => setLoginData({ ...loginData, registration: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 shadow-md shadow-indigo-100"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-100">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <ClipboardList className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-zinc-900 leading-tight">PsicoGestão</h2>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Clínica Escola</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          
          {(user.role === 'ADMIN' || user.role === 'STUDENT_CLINIC') && (
            <SidebarItem 
              icon={<UserPlus size={20} />} 
              label="Cadastrar Paciente" 
              active={activeTab === 'register_patient'} 
              onClick={() => setActiveTab('register_patient')} 
            />
          )}

          {(user.role === 'ADMIN' || user.role === 'PROFESSOR') && (
            <SidebarItem 
              icon={<Calendar size={20} />} 
              label="Agendamentos" 
              active={activeTab === 'scheduling'} 
              onClick={() => setActiveTab('scheduling')} 
            />
          )}

          {(user.role === 'ADMIN' || user.role === 'PROFESSOR' || user.role === 'STUDENT_CLINIC') && (
            <SidebarItem 
              icon={<Users size={20} />} 
              label="Pacientes / Histórico" 
              active={activeTab === 'patients'} 
              onClick={() => setActiveTab('patients')} 
            />
          )}

          {(user.role === 'ADMIN' || user.role === 'STUDENT' || user.role === 'PROFESSOR') && (
            <SidebarItem 
              icon={<Clock size={20} />} 
              label="Minhas Consultas" 
              active={activeTab === 'my_appointments'} 
              onClick={() => setActiveTab('my_appointments')} 
            />
          )}

          {(user.role === 'ADMIN' || user.role === 'PROFESSOR') && (
            <SidebarItem 
              icon={<Settings size={20} />} 
              label="Configurações" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-zinc-900 truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{ROLES[user.role]}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DashboardView user={user} patients={patients} appointments={appointments} />
            </motion.div>
          )}
          {activeTab === 'register_patient' && (
            <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RegisterPatientView onComplete={() => {
                showToast('Paciente cadastrado com sucesso!', 'success');
                setActiveTab('dashboard');
              }} />
            </motion.div>
          )}
          {activeTab === 'scheduling' && (
            <motion.div key="scheduling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SchedulingView 
                patients={patients} 
                users={users} 
                settings={settings}
                appointments={appointments}
                onComplete={() => {
                  showToast('Agendamento realizado!', 'success');
                  setActiveTab('dashboard');
                }} 
              />
            </motion.div>
          )}
          {activeTab === 'patients' && (
            <motion.div key="patients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PatientHistoryView 
                patients={patients} 
                appointments={appointments} 
                onBack={() => setActiveTab('dashboard')} 
              />
            </motion.div>
          )}
          {activeTab === 'my_appointments' && (
            <motion.div key="my_appointments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MyAppointmentsView 
                user={user} 
                appointments={appointments} 
                settings={settings}
                onUpdate={() => {}} 
              />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsView 
                users={users} 
                settings={settings}
                onUpdate={() => {}} 
                onUpdateSettings={setSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 animate-bounce ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
      
      <div className="fixed bottom-2 right-4 text-[10px] text-zinc-400 font-medium pointer-events-none">
        SISTEMA CRIADO POR MARCOS TEIXEIRA
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DashboardView({ user, patients, appointments }: { user: User, patients: Patient[], appointments: Appointment[] }) {
  const stats = useMemo(() => {
    return {
      total: patients.length,
      triagem: patients.filter(p => p.status === 'TRIAGEM').length,
      ativos: patients.filter(p => p.status === 'PACIENTE_ATIVO').length,
      hoje: appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length
    };
  }, [patients, appointments]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Bem-vindo, {user.name}</h1>
        <p className="text-zinc-500">Aqui está o resumo da clínica hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total de Pacientes" value={stats.total} icon={<Users className="text-indigo-600" />} color="bg-indigo-50" />
        <StatCard label="Em Triagem" value={stats.triagem} icon={<Search className="text-yellow-600" />} color="bg-yellow-50" />
        <StatCard label="Pacientes Ativos" value={stats.ativos} icon={<UserCheck className="text-green-600" />} color="bg-green-50" />
        <StatCard label="Consultas Hoje" value={stats.hoje} icon={<Calendar className="text-blue-600" />} color="bg-blue-50" />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <h3 className="font-bold text-zinc-900">Pacientes Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Idade</th>
                <th className="px-6 py-3">CPF</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {patients.slice(-5).reverse().map(patient => (
                <tr key={patient.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">{patient.name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{calculateAge(patient.birth_date)} anos</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{patient.cpf}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[patient.status]}`}>
                      {PATIENT_STATUS_LABELS[patient.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function RegisterPatientView({ onComplete }: { onComplete: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    phone: '',
    email: '',
    cpf: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Check if CPF already exists
      const q = query(collection(db, 'patients'), where('cpf', '==', formData.cpf));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setError('CPF já cadastrado');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'patients'), {
        ...formData,
        status: 'TRIAGEM'
      });
      onComplete();
    } catch (err) {
      console.error(err);
      setError('Erro ao cadastrar paciente no Firebase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">Cadastrar Novo Paciente</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Data de Nascimento</label>
            <input
              type="date"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.birth_date}
              onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">CPF</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={e => setFormData({ ...formData, cpf: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
            <input
              type="tel"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Endereço</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          {error && <p className="md:col-span-2 text-red-500 text-sm">{error}</p>}
          <div className="md:col-span-2 flex justify-end gap-4 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SchedulingView({ patients, users, settings, appointments, onComplete }: { patients: Patient[], users: User[], settings: ClinicSettings, appointments: Appointment[], onComplete: () => void }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    student_id: '',
    supervisor_id: '',
    date: '',
    time: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduledData, setScheduledData] = useState<{
    patientName: string;
    date: string;
    time: string;
    phone: string;
  } | null>(null);

  const triagemPatients = patients.filter(p => p.status === 'TRIAGEM');
  const students = users.filter(u => u.role === 'STUDENT' || u.role === 'STUDENT_CLINIC');
  const supervisors = users.filter(u => u.role === 'PROFESSOR' || u.role === 'ADMIN');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Check for available slots (max 2 per time)
      const existingAppointments = appointments.filter(
        a => a.date === formData.date && a.time === formData.time && a.status === 'SCHEDULED'
      );

      if (existingAppointments.length >= 2) {
        setError('Este horário já possui 2 agendamentos. Por favor, escolha outro horário.');
        setLoading(false);
        return;
      }

      // Find patient BEFORE async operations to ensure we have the data
      const patient = patients.find(p => p.id === formData.patient_id);
      const student = users.find(u => u.id === formData.student_id);
      const supervisor = users.find(u => u.id === formData.supervisor_id);

      if (!patient) {
        console.error('Patient not found');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'appointments'), {
        ...formData,
        patient_name: patient.name,
        student_name: student?.name,
        supervisor_name: supervisor?.name,
        status: 'SCHEDULED'
      });

      // Update patient status
      await updateDoc(doc(db, 'patients', formData.patient_id), {
        status: 'AGUARDANDO_CONSULTA'
      });

      // Set scheduled data for success screen
      setScheduledData({
        patientName: patient.name,
        date: formData.date,
        time: formData.time,
        phone: patient.phone || ''
      });
      
    } catch (err) {
      console.error(err);
      // Only close if there was an error that we can't recover from easily, 
      // or maybe show error message. For now, let's keep it open so user can retry.
    } finally {
      setLoading(false);
    }
  };

  if (scheduledData) {
    const phone = scheduledData.phone.replace(/\D/g, '');
    const template = settings.whatsappMessageTemplate || 'Olá {paciente}, sua consulta na Clínica Escola PsicoGestão está agendada para {data} às {hora}. Por favor, confirme sua presença.';
    
    const message = encodeURIComponent(
      template
        .replace('{paciente}', scheduledData.patientName)
        .replace('{data}', new Date(scheduledData.date).toLocaleDateString('pt-BR'))
        .replace('{hora}', scheduledData.time)
    );
    const whatsappUrl = `https://wa.me/55${phone}?text=${message}`;

    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600 w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Agendamento Realizado!</h2>
          <p className="text-zinc-500 mb-6">
            A consulta foi agendada com sucesso. Envie uma mensagem de confirmação para o paciente.
          </p>
          
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors mb-3"
          >
            <MessageCircle size={20} />
            Enviar WhatsApp
          </a>
          
          <button
            onClick={onComplete}
            className="w-full py-3 text-zinc-500 hover:text-zinc-900 font-medium"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">Agendar Consulta</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Paciente (Em Triagem)</label>
            <select
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.patient_id}
              onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
            >
              <option value="">Selecione um paciente</option>
              {triagemPatients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({calculateAge(p.birth_date)} anos)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Aluno Atendente</label>
              <select
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.student_id}
                onChange={e => setFormData({ ...formData, student_id: e.target.value })}
              >
                <option value="">Selecione o aluno</option>
                {students.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Supervisor</label>
              <select
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.supervisor_id}
                onChange={e => setFormData({ ...formData, supervisor_id: e.target.value })}
              >
                <option value="">Selecione o supervisor</option>
                {supervisors.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Data</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Horário</label>
              <input
                type="time"
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Agendando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MyAppointmentsView({ user, appointments, settings, onUpdate }: { user: User, appointments: Appointment[], settings: ClinicSettings, onUpdate: () => void }) {
  const filteredAppointments = useMemo(() => {
    if (user.role === 'ADMIN' || user.role === 'PROFESSOR') return appointments;
    return appointments.filter(a => a.student_id === user.id);
  }, [user, appointments]);

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [actionType, setActionType] = useState<'FINALIZE' | 'SCHEDULE_NEXT' | null>(null);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateStatus = async (id: string, status: 'ATTENDED' | 'MISSED') => {
    setUpdatingId(id);
    try {
      const appRef = doc(db, 'appointments', id);
      await updateDoc(appRef, { status });
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFinalize = async (type: 'ALTA' | 'DESISTENCIA') => {
    if (!selectedAppointment) return;
    setProcessingAction(true);
    try {
      const appRef = doc(db, 'appointments', selectedAppointment.id);
      const appSnap = await getDoc(appRef);
      
      // Update appointment status to reflect the final decision
      await updateDoc(appRef, { status: type });

      if (appSnap.exists()) {
        const patientId = appSnap.data().patient_id;
        await updateDoc(doc(db, 'patients', patientId), { status: type });
      }
      onUpdate();
      setSelectedAppointment(null);
      setActionType(null);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingAction(false);
    }
  };

  const [scheduledData, setScheduledData] = useState<{
    patientName: string;
    date: string;
    time: string;
    phone: string;
  } | null>(null);

  const handleScheduleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setProcessingAction(true);
    setError('');
    try {
      // Check for available slots (max 2 per time)
      const existingAppointments = appointments.filter(
        a => a.date === nextDate && a.time === nextTime && a.status === 'SCHEDULED'
      );

      if (existingAppointments.length >= 2) {
        setError('Este horário já possui 2 agendamentos. Por favor, escolha outro horário.');
        setProcessingAction(false);
        return;
      }

      const appRef = doc(db, 'appointments', selectedAppointment.id);
      const appSnap = await getDoc(appRef);
      let patientPhone = '';
      
      if (appSnap.exists()) {
         const patientId = appSnap.data().patient_id;
         const patientRef = doc(db, 'patients', patientId);
         const patientSnap = await getDoc(patientRef);
         if (patientSnap.exists()) {
             patientPhone = patientSnap.data().phone || '';
         }
      }

      await addDoc(collection(db, 'appointments'), {
        patient_id: selectedAppointment.patient_id,
        patient_name: selectedAppointment.patient_name,
        student_id: selectedAppointment.student_id,
        student_name: selectedAppointment.student_name,
        supervisor_id: selectedAppointment.supervisor_id,
        supervisor_name: selectedAppointment.supervisor_name,
        date: nextDate,
        time: nextTime,
        status: 'SCHEDULED'
      });

      await updateDoc(doc(db, 'patients', selectedAppointment.patient_id), {
        status: 'AGUARDANDO_CONSULTA'
      });

      onUpdate();
      
      setScheduledData({
        patientName: selectedAppointment.patient_name || '',
        date: nextDate,
        time: nextTime,
        phone: patientPhone
      });

      setSelectedAppointment(null);
      setActionType(null);
      setNextDate('');
      setNextTime('');
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingAction(false);
    }
  };

  const getWhatsappUrl = () => {
    if (!scheduledData) return '';
    const phone = scheduledData.phone.replace(/\D/g, '');
    const template = settings.whatsappMessageTemplate || 'Olá {paciente}, sua consulta na Clínica Escola PsicoGestão está agendada para {data} às {hora}. Por favor, confirme sua presença.';
    
    const message = encodeURIComponent(
      template
        .replace('{paciente}', scheduledData.patientName)
        .replace('{data}', new Date(scheduledData.date).toLocaleDateString('pt-BR'))
        .replace('{hora}', scheduledData.time)
    );
    return `https://wa.me/55${phone}?text=${message}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Minhas Consultas</h1>
        <p className="text-zinc-500">Gerencie seus atendimentos e presenças.</p>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-3">Paciente</th>
                <th className="px-6 py-3">Data/Hora</th>
                <th className="px-6 py-3">Supervisor</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredAppointments.map(app => (
                <tr key={app.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">{app.patient_name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {new Date(app.date).toLocaleDateString('pt-BR')} às {app.time}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{app.supervisor_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      app.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                      app.status === 'ATTENDED' ? 'bg-green-100 text-green-800' :
                      app.status === 'MISSED' ? 'bg-red-100 text-red-800' :
                      app.status === 'ALTA' ? 'bg-purple-100 text-purple-800' :
                      app.status === 'DESISTENCIA' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {app.status === 'SCHEDULED' ? 'Agendado' :
                       app.status === 'ATTENDED' ? 'Realizado' :
                       app.status === 'MISSED' ? 'Falta' :
                       app.status === 'ALTA' ? 'Alta' :
                       app.status === 'DESISTENCIA' ? 'Desistência' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {app.status === 'SCHEDULED' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'ATTENDED')}
                          disabled={updatingId === app.id}
                          className={`px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 ${updatingId === app.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updatingId === app.id ? '...' : 'Confirmar Presença'}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'MISSED')}
                          disabled={updatingId === app.id}
                          className={`px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 ${updatingId === app.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updatingId === app.id ? '...' : 'Falta'}
                        </button>
                      </div>
                    )}
                    {(app.status === 'ATTENDED' || app.status === 'MISSED') && (
                      <button
                        onClick={() => { setSelectedAppointment(app); setActionType('FINALIZE'); }}
                        className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-200"
                      >
                        Finalizar / Próximos Passos
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Finalizing */}
      {selectedAppointment && actionType === 'FINALIZE' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Finalizar Atendimento</h3>
            <p className="text-zinc-500 mb-6">Paciente: {selectedAppointment.patient_name}</p>
            
            <div className="space-y-4">
              <button 
                onClick={() => setActionType('SCHEDULE_NEXT')}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
              >
                Agendar Nova Consulta
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleFinalize('ALTA')}
                  disabled={processingAction}
                  className={`px-4 py-3 border border-green-200 bg-green-50 text-green-700 rounded-lg font-semibold hover:bg-green-100 ${processingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processingAction ? '...' : 'Dar Alta'}
                </button>
                <button 
                  onClick={() => handleFinalize('DESISTENCIA')}
                  disabled={processingAction}
                  className={`px-4 py-3 border border-red-200 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 ${processingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processingAction ? '...' : 'Desistência'}
                </button>
              </div>

              <button 
                onClick={() => { setSelectedAppointment(null); setActionType(null); }}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-900 mt-4"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal for Scheduling Next */}
      {selectedAppointment && actionType === 'SCHEDULE_NEXT' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Agendar Próxima Consulta</h3>
            <p className="text-zinc-500 mb-6">Paciente: {selectedAppointment.patient_name}</p>
            
            <form onSubmit={handleScheduleNext} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 outline-none"
                    value={nextDate}
                    onChange={e => setNextDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Hora</label>
                  <input 
                    type="time" 
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 outline-none"
                    value={nextTime}
                    onChange={e => setNextTime(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={processingAction}
                className={`w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 ${processingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {processingAction ? 'Agendando...' : 'Confirmar Agendamento'}
              </button>
              <button 
                type="button"
                onClick={() => setActionType('FINALIZE')}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-900"
              >
                Voltar
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal for Success with WhatsApp */}
      {scheduledData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Agendamento Realizado!</h2>
            <p className="text-zinc-500 mb-6">
              A consulta foi agendada com sucesso. Envie uma mensagem de confirmação para o paciente.
            </p>
            
            <a 
              href={getWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors mb-3"
            >
              <MessageCircle size={20} />
              Enviar WhatsApp
            </a>
            
            <button
              onClick={() => setScheduledData(null)}
              className="w-full py-3 text-zinc-500 hover:text-zinc-900 font-medium"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function PatientHistoryView({ patients, appointments, onBack }: { patients: Patient[], appointments: Appointment[], onBack: () => void }) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientAppointments = appointments
    .filter(a => a.patient_id === selectedPatientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const stats = useMemo(() => {
    if (!selectedPatientId) return null;
    return {
      total: patientAppointments.length,
      attended: patientAppointments.filter(a => a.status === 'ATTENDED').length,
      missed: patientAppointments.filter(a => a.status === 'MISSED').length,
    };
  }, [patientAppointments, selectedPatientId]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-lg">
          <ChevronRight className="rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Histórico do Paciente</h1>
          <p className="text-zinc-500">Visualize o histórico de atendimentos.</p>
        </div>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <label className="block text-sm font-medium text-zinc-700 mb-2">Selecione o Paciente</label>
        <select
          className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedPatientId}
          onChange={e => setSelectedPatientId(e.target.value)}
        >
          <option value="">Selecione um paciente...</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {selectedPatient && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-blue-600 uppercase">Total</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <p className="text-xs font-bold text-green-600 uppercase">Presenças</p>
              <p className="text-2xl font-bold text-green-900">{stats.attended}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-xs font-bold text-red-600 uppercase">Faltas</p>
              <p className="text-2xl font-bold text-red-900">{stats.missed}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Hora</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Supervisor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {patientAppointments.map(app => (
                  <tr key={app.id}>
                    <td className="px-6 py-4 text-sm text-zinc-900">{new Date(app.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{app.time}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        app.status === 'ATTENDED' ? 'bg-green-100 text-green-800' :
                        app.status === 'MISSED' ? 'bg-red-100 text-red-800' :
                        app.status === 'ALTA' ? 'bg-purple-100 text-purple-800' :
                        app.status === 'DESISTENCIA' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {app.status === 'ATTENDED' ? 'Compareceu' :
                         app.status === 'MISSED' ? 'Faltou' : 
                         app.status === 'ALTA' ? 'Alta' :
                         app.status === 'DESISTENCIA' ? 'Desistência' : 'Agendado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{app.supervisor_name}</td>
                  </tr>
                ))}
                {patientAppointments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ users, settings, onUpdate, onUpdateSettings }: { users: User[], settings: ClinicSettings, onUpdate: () => void, onUpdateSettings: (s: ClinicSettings) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    registration: '',
    password: '',
    role: 'STUDENT' as UserRole
  });
  const [loading, setLoading] = useState(false);
  const [scheduleData, setScheduleData] = useState<ClinicSettings>(settings);

  useEffect(() => {
    setScheduleData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'users'), formData);
      setFormData({ name: '', registration: '', password: '', role: 'STUDENT' });
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'clinic_schedule'), scheduleData);
      onUpdateSettings(scheduleData);
      alert('Horários atualizados com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar horários');
    }
  };

  const toggleDay = (day: number) => {
    const newDays = scheduleData.workDays.includes(day)
      ? scheduleData.workDays.filter(d => d !== day)
      : [...scheduleData.workDays, day].sort();
    setScheduleData({ ...scheduleData, workDays: newDays });
  };

  const handleToggleBlock = async (userId: string, currentStatus?: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        blocked: !currentStatus
      });
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status do usuário');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Configurações do Sistema</h1>
        <p className="text-zinc-500">Gerencie usuários e horários da clínica.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Registration */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-6">Cadastrar Usuário</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Matrícula</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.registration}
                onChange={e => setFormData({ ...formData, registration: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Acesso</label>
              <select
                required
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value="STUDENT">Atendente</option>
                <option value="STUDENT_CLINIC">Atendente Clínica</option>
                <option value="PROFESSOR">Professor/Supervisor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </button>
          </form>
        </div>

        {/* Clinic Schedule */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm h-fit">
          <h3 className="font-bold text-zinc-900 mb-6">Horários de Atendimento</h3>
          <form onSubmit={handleSaveSchedule} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Dias de Funcionamento</label>
              <div className="flex flex-wrap gap-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${
                      scheduleData.workDays.includes(index)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Início</label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={scheduleData.startTime}
                  onChange={e => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Fim</label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={scheduleData.endTime}
                  onChange={e => setScheduleData({ ...scheduleData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Duração da Consulta (minutos)</label>
              <input
                type="number"
                required
                min="15"
                step="15"
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value={scheduleData.interval}
                onChange={e => setScheduleData({ ...scheduleData, interval: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Modelo de Mensagem WhatsApp</label>
              <p className="text-xs text-zinc-500 mb-2">Use {'{paciente}'}, {'{data}'} e {'{hora}'} como variáveis.</p>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                value={scheduleData.whatsappMessageTemplate || ''}
                onChange={e => setScheduleData({ ...scheduleData, whatsappMessageTemplate: e.target.value })}
                placeholder="Olá {paciente}, sua consulta está agendada para {data} às {hora}."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-zinc-900 text-white py-2 rounded-lg font-semibold hover:bg-zinc-800 transition-colors"
            >
              Salvar Configurações
            </button>
          </form>
        </div>
      </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Usuários Cadastrados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">Matrícula</th>
                    <th className="px-6 py-3">Cargo</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-zinc-900">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{u.registration}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold uppercase">
                          {ROLES[u.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {u.blocked ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleToggleBlock(u.id, u.blocked)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              u.blocked 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {u.blocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
}
