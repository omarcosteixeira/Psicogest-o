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
  LayoutDashboard,
  Trash2,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Patient, Appointment, UserRole, PatientStatus, ClinicSettings, Evolution, EvolutionStatus } from './types';
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
  deleteDoc,
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
          
          {(user.role === 'ADMIN' || user.role === 'STUDENT_CLINIC' || user.role === 'PROFESSOR') && (
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
                user={user}
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
        medical_record_number: Math.floor(100000 + Math.random() * 900000).toString(),
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
  const [actionType, setActionType] = useState<'FINALIZE' | 'SCHEDULE_NEXT' | 'EVOLUTION' | null>(null);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [error, setError] = useState('');
  const [evolutionData, setEvolutionData] = useState<Evolution | null>(null);

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
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedAppointment(app); setActionType('FINALIZE'); }}
                          className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-200"
                        >
                          Finalizar / Próximos Passos
                        </button>
                        {app.status === 'ATTENDED' && (
                          <button
                            onClick={() => { setSelectedAppointment(app); setActionType('EVOLUTION'); }}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200"
                          >
                            Evolução
                          </button>
                        )}
                      </div>
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

      {/* Modal for Evolution */}
      {selectedAppointment && actionType === 'EVOLUTION' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl my-8">
            <EvolutionForm 
              appointment={selectedAppointment}
              user={user}
              onClose={() => { setSelectedAppointment(null); setActionType(null); }}
              onSave={() => {
                onUpdate();
                setSelectedAppointment(null);
                setActionType(null);
              }}
            />
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

function PatientHistoryView({ patients, appointments, user, onBack }: { patients: Patient[], appointments: Appointment[], user: User, onBack: () => void }) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loadingEvolutions, setLoadingEvolutions] = useState(false);
  const [selectedEvolution, setSelectedEvolution] = useState<Evolution | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editingPatientData, setEditingPatientData] = useState<Partial<Patient>>({});
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'clinic_schedule'));
      if (docSnap.exists()) {
        setSettings(docSnap.data() as ClinicSettings);
      }
    };
    fetchSettings();
  }, []);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientAppointments = appointments
    .filter(a => a.patient_id === selectedPatientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    if (selectedPatientId) {
      setLoadingEvolutions(true);
      const q = query(collection(db, 'evolutions'), where('patient_id', '==', selectedPatientId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const evs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evolution));
        setEvolutions(evs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLoadingEvolutions(false);
      });
      return () => unsubscribe();
    }
  }, [selectedPatientId]);

  const stats = useMemo(() => {
    if (!selectedPatientId) return null;
    return {
      total: patientAppointments.length,
      attended: patientAppointments.filter(a => a.status === 'ATTENDED').length,
      missed: patientAppointments.filter(a => a.status === 'MISSED').length,
    };
  }, [patientAppointments, selectedPatientId]);

  const handleApprove = async (evId: string) => {
    try {
      await updateDoc(doc(db, 'evolutions', evId), { status: 'APPROVED' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!selectedEvolution || !feedback) return;
    try {
      await updateDoc(doc(db, 'evolutions', selectedEvolution.id), { 
        status: 'REJECTED',
        feedback: feedback
      });
      setShowFeedbackModal(false);
      setFeedback('');
      setSelectedEvolution(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditPatient = () => {
    if (!selectedPatient) return;
    setEditingPatientData(selectedPatient);
    setIsEditingPatient(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    try {
      await updateDoc(doc(db, 'patients', selectedPatientId), editingPatientData);
      setIsEditingPatient(false);
      alert('Dados do paciente atualizados com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar paciente');
    }
  };

  const handleDeletePatient = async () => {
    if (!selectedPatientId) return;
    setIsDeleting(true);
    try {
      // 1. Delete appointments
      const qApp = query(collection(db, 'appointments'), where('patient_id', '==', selectedPatientId));
      const snapApp = await getDocs(qApp);
      const deleteAppPromises = snapApp.docs.map(d => deleteDoc(doc(db, 'appointments', d.id)));
      
      // 2. Delete evolutions
      const qEv = query(collection(db, 'evolutions'), where('patient_id', '==', selectedPatientId));
      const snapEv = await getDocs(qEv);
      const deleteEvPromises = snapEv.docs.map(d => deleteDoc(doc(db, 'evolutions', d.id)));
      
      await Promise.all([...deleteAppPromises, ...deleteEvPromises]);

      // 3. Delete patient
      await deleteDoc(doc(db, 'patients', selectedPatientId));
      
      setSelectedPatientId('');
      setShowDeleteConfirm(false);
      alert('Paciente e todo seu histórico foram excluídos com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir paciente: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = (ev: Evolution) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoHtml = settings?.logoUrl 
      ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${settings.logoUrl}" style="max-height: 80px;" /></div>`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Evolução Psicológica - ${ev.patient_name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 30px; padding-bottom: 10px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; }
            .content { margin-top: 5px; border: 1px solid #eee; padding: 10px; border-radius: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          ${logoHtml}
          <div class="header">
            <h1>EVOLUÇÃO PSICOLÓGICA</h1>
            <p>Clínica Escola PsicoGestão</p>
          </div>
          <div class="grid">
            <div><span class="label">Prontuário:</span><br/>${ev.medical_record_number}</div>
            <div><span class="label">Paciente:</span><br/>${ev.patient_name}</div>
            <div><span class="label">Data:</span><br/>${new Date(ev.date).toLocaleDateString('pt-BR')}</div>
            <div><span class="label">Atendente:</span><br/>${ev.student_name}</div>
          </div>
          <div class="section">
            <span class="label">Supervisor:</span><br/>${ev.supervisor_name}
          </div>
          <div class="section">
            <span class="label">Síntese da Escuta:</span>
            <div class="content">${ev.synthesis.replace(/\n/g, '<br/>')}</div>
          </div>
          <div class="section">
            <span class="label">Conduta:</span>
            <div class="content">${ev.conduct.replace(/\n/g, '<br/>')}</div>
          </div>
          <div class="section">
            <span class="label">Observações:</span>
            <div class="content">${ev.observations.replace(/\n/g, '<br/>')}</div>
          </div>
          <div style="margin-top: 50px; text-align: center;">
            <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto;"></div>
            <p class="label">Assinatura do Supervisor</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-lg">
            <ChevronRight className="rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Histórico do Paciente</h1>
            <p className="text-zinc-500">Visualize o histórico de atendimentos e evoluções.</p>
          </div>
        </div>
        {selectedPatient && (user.role === 'ADMIN' || user.role === 'PROFESSOR' || user.role === 'STUDENT_CLINIC') && (
          <div className="flex gap-2">
            <button 
              onClick={handleEditPatient}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
            >
              <Edit2 size={18} />
              Editar Paciente
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-bold hover:bg-red-100 transition-colors"
            >
              <Trash2 size={18} />
              Excluir Paciente
            </button>
          </div>
        )}
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
            <option key={p.id} value={p.id}>{p.name} (Prontuário: {p.medical_record_number})</option>
          ))}
        </select>
      </div>

      {isEditingPatient && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl my-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-6">Editar Dados do Paciente</h2>
            <form onSubmit={handleSavePatient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editingPatientData.name || ''}
                  onChange={e => setEditingPatientData({ ...editingPatientData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editingPatientData.phone || ''}
                  onChange={e => setEditingPatientData({ ...editingPatientData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editingPatientData.email || ''}
                  onChange={e => setEditingPatientData({ ...editingPatientData, email: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Endereço</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editingPatientData.address || ''}
                  onChange={e => setEditingPatientData({ ...editingPatientData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editingPatientData.status || ''}
                  onChange={e => setEditingPatientData({ ...editingPatientData, status: e.target.value as PatientStatus })}
                >
                  <option value="TRIAGEM">Triagem</option>
                  <option value="AGUARDANDO_CONSULTA">Aguardando Consulta</option>
                  <option value="PACIENTE_ATIVO">Paciente Ativo</option>
                  <option value="ALTA">Alta</option>
                  <option value="DESISTENCIA">Desistência</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPatient(false)}
                  className="px-6 py-2 border border-zinc-300 text-zinc-600 rounded-lg font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
            <div className="p-4 border-b border-zinc-100 bg-zinc-50">
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">Histórico de Agendamentos</h3>
            </div>
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

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">Evoluções Psicológicas</h3>
              {loadingEvolutions && <span className="text-xs text-zinc-400 animate-pulse">Carregando...</span>}
            </div>
            <div className="p-6 space-y-6">
              {evolutions.map(ev => (
                <div key={ev.id} className="border border-zinc-100 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-zinc-500">Atendente: {ev.student_name} | Supervisor: {ev.supervisor_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      ev.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      ev.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ev.status === 'APPROVED' ? 'Aprovado' :
                       ev.status === 'REJECTED' ? 'Rejeitado' : 'Aguardando Aprovação'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Síntese da Escuta</p>
                      <p className="text-zinc-700 whitespace-pre-wrap">{ev.synthesis}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Conduta</p>
                      <p className="text-zinc-700 whitespace-pre-wrap">{ev.conduct}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Observações</p>
                      <p className="text-zinc-700 whitespace-pre-wrap">{ev.observations}</p>
                    </div>
                    {ev.feedback && (
                      <div className="md:col-span-2 bg-red-50 p-3 rounded-lg border border-red-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Feedback do Supervisor</p>
                        <p className="text-red-700">{ev.feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-zinc-50">
                    {(user.role === 'ADMIN' || user.role === 'PROFESSOR') && ev.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => handleApprove(ev.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button 
                          onClick={() => { setSelectedEvolution(ev); setShowFeedbackModal(true); }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                    {ev.status === 'APPROVED' && (
                      <button 
                        onClick={() => handlePrint(ev)}
                        className="px-3 py-1 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2"
                      >
                        <ClipboardList size={14} />
                        Imprimir / PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {evolutions.length === 0 && !loadingEvolutions && (
                <p className="text-center text-zinc-500 py-8">Nenhuma evolução registrada para este paciente.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Excluir Paciente?</h2>
            <p className="text-zinc-500 mb-6">
              Tem certeza que deseja excluir <strong>{selectedPatient.name}</strong>? 
              Esta ação excluirá permanentemente o paciente, todos os seus agendamentos e evoluções.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeletePatient}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Tudo'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Motivo da Rejeição</h3>
            <p className="text-zinc-500 mb-4 text-sm">Informe ao aluno o que precisa ser corrigido.</p>
            <textarea
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] mb-4"
              placeholder="Ex: Melhorar a descrição da conduta..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
            <div className="flex gap-3">
              <button 
                onClick={handleReject}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Confirmar Rejeição
              </button>
              <button 
                onClick={() => { setShowFeedbackModal(false); setFeedback(''); }}
                className="px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg font-bold hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function EvolutionForm({ appointment, user, onClose, onSave }: { appointment: Appointment, user: User, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    synthesis: '',
    conduct: '',
    observations: ''
  });
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<Patient | null>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      const docRef = doc(db, 'patients', appointment.patient_id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPatientData({ id: docSnap.id, ...docSnap.data() } as Patient);
      }
    };
    fetchPatient();
  }, [appointment.patient_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'evolutions'), {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        patient_name: appointment.patient_name,
        medical_record_number: patientData?.medical_record_number || '',
        student_id: user.id,
        student_name: user.name,
        supervisor_id: appointment.supervisor_id,
        supervisor_name: appointment.supervisor_name,
        date: new Date().toISOString().split('T')[0],
        ...formData,
        status: 'PENDING'
      });
      onSave();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar evolução');
    } finally {
      setLoading(false);
    }
  };

  if (!patientData) return <div className="text-center py-8">Carregando dados do paciente...</div>;

  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-100 pb-4">
        <h2 className="text-2xl font-bold text-zinc-900">EVOLUÇÃO PSICOLÓGICA</h2>
        <p className="text-zinc-500 text-sm">Preencha os dados do atendimento</p>
      </header>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-zinc-50 p-3 rounded-lg">
          <span className="block text-zinc-500 font-bold uppercase text-[10px]">Prontuário</span>
          <span className="text-zinc-900 font-medium">{patientData.medical_record_number}</span>
        </div>
        <div className="bg-zinc-50 p-3 rounded-lg">
          <span className="block text-zinc-500 font-bold uppercase text-[10px]">Paciente</span>
          <span className="text-zinc-900 font-medium">{patientData.name}</span>
        </div>
        <div className="bg-zinc-50 p-3 rounded-lg">
          <span className="block text-zinc-500 font-bold uppercase text-[10px]">Data</span>
          <span className="text-zinc-900 font-medium">{new Date().toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="bg-zinc-50 p-3 rounded-lg">
          <span className="block text-zinc-500 font-bold uppercase text-[10px]">Atendente</span>
          <span className="text-zinc-900 font-medium">{user.name}</span>
        </div>
        <div className="bg-zinc-50 p-3 rounded-lg col-span-2">
          <span className="block text-zinc-500 font-bold uppercase text-[10px]">Supervisor</span>
          <span className="text-zinc-900 font-medium">{appointment.supervisor_name}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-1 uppercase">Síntese da Escuta</label>
          <textarea
            required
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
            value={formData.synthesis}
            onChange={e => setFormData({ ...formData, synthesis: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-1 uppercase">Conduta</label>
          <textarea
            required
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
            value={formData.conduct}
            onChange={e => setFormData({ ...formData, conduct: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-1 uppercase">Observações</label>
          <textarea
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
            value={formData.observations}
            onChange={e => setFormData({ ...formData, observations: e.target.value })}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Evolução'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-zinc-300 text-zinc-600 rounded-lg font-bold hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleData, setScheduleData] = useState<ClinicSettings>(settings);

  useEffect(() => {
    setScheduleData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'users'), formData);
      }
      setFormData({ name: '', registration: '', password: '', role: 'STUDENT' });
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setFormData({
      name: user.name,
      registration: user.registration,
      password: (user as any).password || '',
      role: user.role
    });
    setEditingId(user.id);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'users', userId));
        onUpdate();
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir usuário');
      }
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'clinic_schedule'), scheduleData);
      onUpdateSettings(scheduleData);
      alert('Configurações atualizadas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar configurações');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScheduleData({ ...scheduleData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
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
          <h3 className="font-bold text-zinc-900 mb-6">{editingId ? 'Editar Usuário' : 'Cadastrar Usuário'}</h3>
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
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ name: '', registration: '', password: '', role: 'STUDENT' });
                  }}
                  className="px-4 py-2 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
              )}
            </div>
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

            <div className="border-t border-zinc-100 pt-6">
              <label className="block text-sm font-medium text-zinc-700 mb-2">Logo da Clínica (PDF)</label>
              <div className="flex items-center gap-4">
                {scheduleData.logoUrl && (
                  <img src={scheduleData.logoUrl} alt="Logo" className="h-12 w-auto object-contain border border-zinc-200 rounded p-1" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">Recomendado: PNG ou JPG com fundo transparente.</p>
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
                          <div className="flex gap-2">
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
                            <button
                              onClick={() => handleEditUser(u)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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
