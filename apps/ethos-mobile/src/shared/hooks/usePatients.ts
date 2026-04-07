import { useState, useEffect, useCallback } from 'react';
import { fetchPatients } from '../services/api/sessions';

export interface Patient {
    id: string;
    name: string;
    lastSession: string;
    status: 'active' | 'inactive';
    phone?: string;
    email?: string;
    cpf?: string;
    birth_date?: string;
    notes?: string;
    external_id?: string;
}

function adaptPatient(raw: any): Patient {
    return {
        id: raw.id,
        name: raw.label ?? raw.name ?? '—',
        lastSession: raw.last_session_at
            ? new Date(raw.last_session_at).toLocaleDateString('pt-BR')
            : '—',
        status: 'active',
        phone: raw.phone,
        email: raw.email,
        cpf: raw.cpf,
        birth_date: raw.birth_date,
        notes: raw.notes,
        external_id: raw.external_id,
    };
}

export function usePatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const raw = await fetchPatients();
            setPatients(Array.isArray(raw) ? raw.map(adaptPatient) : []);
        } catch (e: any) {
            setError(e?.message ?? 'Erro ao carregar pacientes');
            setPatients([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return { patients, isLoading, error, reload: load };
}
